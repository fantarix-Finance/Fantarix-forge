/**
 * KRX (Korea Exchange) REST API Client
 * 
 * Directly calls KRX official APIs to get stock prices and trading information.
 * Based on korea-stock-mcp implementation but without MCP protocol overhead.
 */

export type KoreaMarket = 'KOSPI' | 'KOSDAQ' | 'KONEX';

interface KRXTradeInfo {
    ISU_CD: string;          // 종목코드
    ISU_NM: string;          // 종목명
    TDD_CLSPRC: string;      // 종가
    FLUC_RT: string;         // 등락률
    TDD_OPNPRC: string;      // 시가
    TDD_HGPRC: string;       // 고가
    TDD_LWPRC: string;       // 저가
    ACC_TRDVOL: string;      // 거래량
    ACC_TRDVAL: string;      // 거래대금
    MKTCAP: string;          // 시가총액
    LIST_SHRS: string;       // 상장주식수
}

interface KRXResponse {
    OutBlock_1: KRXTradeInfo[];
}

const KRX_TRADE_INFO_URLS = {
    KOSPI: 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd',
    KOSDAQ: 'https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd',
    KONEX: 'https://data-dbg.krx.co.kr/svc/apis/sto/knx_bydd_trd',
    ETF: 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd',  // ETF 전용 API (ETP = Exchange Traded Product)
};

/**
 * Build URL with query parameters
 */
function buildUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
}

/**
 * Make authenticated request to KRX API
 */
async function krxRequest(url: string): Promise<Response> {
    const apiKey = process.env.KRX_API_KEY;

    if (!apiKey) {
        throw new Error('KRX_API_KEY is not set. Please add it to your .env.local file.');
    }

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'AUTH_KEY': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`KRX API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
}

/**
 * Determine market type from stock symbol
 * .KS -> KOSPI, .KQ -> KOSDAQ, .KN -> KONEX
 */
function getMarketFromSymbol(symbol: string): KoreaMarket {
    if (symbol.endsWith('.KS')) return 'KOSPI';
    if (symbol.endsWith('.KQ')) return 'KOSDAQ';
    if (symbol.endsWith('.KN')) return 'KONEX';

    // Default to KOSPI for plain ticker codes
    return 'KOSPI';
}

/**
 * Format date as YYYYMMDD using Korea timezone (Asia/Seoul, UTC+9)
 * This ensures consistency regardless of server timezone
 */
function formatDate(date: Date): string {
    // Convert to Korea time explicitly to avoid timezone issues
    const koreaDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const koreaDate = new Date(koreaDateStr);

    const year = koreaDate.getFullYear();
    const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
    const day = String(koreaDate.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Fetch stock price for a specific date
 */
async function fetchStockPriceForDate(
    ticker: string,
    symbol: string,
    market: KoreaMarket,
    url: string,
    basDd: string
) {
    const requestUrl = buildUrl(url, { basDd });

    try {
        const response = await krxRequest(requestUrl);
        const data: KRXResponse = await response.json();

        // If no data for this date, return error
        if (!data.OutBlock_1 || data.OutBlock_1.length === 0) {
            return {
                error: `No trading data available for date ${basDd}`,
                ticker,
                market,
                date: basDd,
            };
        }

        // Find the stock in the response by ticker code
        let stockData = data.OutBlock_1.find(stock => stock.ISU_CD === ticker);

        // If not found by ticker code, try to find by name (for ETFs with different codes)
        if (!stockData && symbol) {
            // Extract potential name from symbol (e.g., "458730.KS" might be "Tiger 미국배당다우존스")
            // Try partial matching on ISU_CD or ISU_NM
            stockData = data.OutBlock_1.find(stock =>
                stock.ISU_CD.includes(ticker) ||
                stock.ISU_NM.includes(ticker)
            );
        }

        if (!stockData) {
            // Log available stocks for debugging
            console.error(`[KRX API] Stock ${ticker} not found in ${market} market for date ${basDd}`);
            console.error(`[KRX API] Available stocks sample:`, data.OutBlock_1.slice(0, 5).map(s => ({ code: s.ISU_CD, name: s.ISU_NM })));

            return {
                error: `Stock ${ticker} not found in ${market} market for date ${basDd}`,
                ticker,
                market,
                date: basDd,
            };
        }

        // Parse and return the data
        return {
            symbol,
            ticker,
            market,
            date: basDd,
            name: stockData.ISU_NM,
            currentPrice: parseFloat(stockData.TDD_CLSPRC.replace(/,/g, '')),
            changePercent: parseFloat(stockData.FLUC_RT),
            open: parseFloat(stockData.TDD_OPNPRC.replace(/,/g, '')),
            high: parseFloat(stockData.TDD_HGPRC.replace(/,/g, '')),
            low: parseFloat(stockData.TDD_LWPRC.replace(/,/g, '')),
            volume: parseInt(stockData.ACC_TRDVOL.replace(/,/g, '')),
            tradingValue: parseInt(stockData.ACC_TRDVAL.replace(/,/g, '')),
            marketCap: parseInt(stockData.MKTCAP.replace(/,/g, '')),
            listedShares: parseInt(stockData.LIST_SHRS.replace(/,/g, '')),
        };
    } catch (error: any) {
        console.error(`[KRX API] Error fetching stock price for ${ticker}:`, error);

        // Return error details
        return {
            error: error.message || 'Failed to fetch stock price',
            ticker,
            market,
            date: basDd,
        };
    }
}

/**
 * Get stock price and trading information
 * Automatically finds the most recent trading day if no date is specified
 * For .KS symbols, tries ETF API first, then falls back to stock API
 * 
 * @param ticker - Stock ticker code (e.g., "005930" for Samsung Electronics, "458730" for ETF)
 * @param symbol - Full symbol with market suffix (e.g., "005930.KS", "458730.KS")
 * @param date - Trading date (optional, defaults to most recent trading day)
 * @returns Stock price and trading information
 */
export async function getStockPrice(ticker: string, symbol: string, date?: string) {
    const market = getMarketFromSymbol(symbol);

    // For KOSPI symbols (.KS), try ETF API first since most portfolio holdings are ETFs
    if (market === 'KOSPI') {
        const etfUrl = KRX_TRADE_INFO_URLS['ETF'];

        // If date is provided, use it directly
        if (date) {
            const etfResult = await fetchStockPriceForDate(ticker, symbol, 'KOSPI', etfUrl, date);
            if (!etfResult.error) {
                console.log(`[KRX API] Found ${ticker} in ETF market`);
                return etfResult;
            }
            // If not found in ETF, try stock API
            const stockUrl = KRX_TRADE_INFO_URLS[market];
            return await fetchStockPriceForDate(ticker, symbol, market, stockUrl, date);
        }

        // Otherwise, find the most recent trading day (up to 14 days back to handle holidays)
        const today = new Date();
        for (let daysBack = 0; daysBack < 14; daysBack++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - daysBack);
            const basDd = formatDate(checkDate);

            // Try ETF API first
            const etfResult = await fetchStockPriceForDate(ticker, symbol, 'KOSPI', etfUrl, basDd);
            if (!etfResult.error) {
                console.log(`[KRX API] Found ${ticker} in ETF market on ${basDd}`);
                return etfResult;
            }

            // If not found in ETF, try stock API
            const stockUrl = KRX_TRADE_INFO_URLS[market];
            const stockResult = await fetchStockPriceForDate(ticker, symbol, market, stockUrl, basDd);
            if (!stockResult.error) {
                console.log(`[KRX API] Found ${ticker} in stock market on ${basDd}`);
                return stockResult;
            }
        }

        // If no data found in the last 14 days
        return {
            error: `No trading data found for ${ticker} in the last 14 days`,
            ticker,
            market,
        };
    }

    // For non-KOSPI symbols, use original logic with 14-day search
    const url = KRX_TRADE_INFO_URLS[market];

    // If date is provided, use it directly
    if (date) {
        return await fetchStockPriceForDate(ticker, symbol, market, url, date);
    }

    // Otherwise, find the most recent trading day (up to 14 days back)
    const today = new Date();
    for (let daysBack = 0; daysBack < 14; daysBack++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const basDd = formatDate(checkDate);

        const result = await fetchStockPriceForDate(ticker, symbol, market, url, basDd);

        // If we got data (no error), return it
        if (!result.error) {
            console.log(`[KRX API] Found data for ${ticker} on ${basDd}`);
            return result;
        }
    }

    // If no data found in the last 14 days
    return {
        error: `No trading data found for ${ticker} in the last 14 days`,
        ticker,
        market,
    };
}

/**
 * Get stock prices for multiple stocks
 * 
 * @param tickers - Array of ticker codes
 * @param symbols - Array of full symbols with market suffixes
 * @param date - Trading date (defaults to most recent trading day)
 */
export async function getStockPrices(
    tickers: string[],
    symbols: string[],
    date?: string
): Promise<any[]> {
    const promises = tickers.map((ticker, index) =>
        getStockPrice(ticker, symbols[index], date)
    );

    return Promise.all(promises);
}
