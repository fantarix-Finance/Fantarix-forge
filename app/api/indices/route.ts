import { NextResponse } from 'next/server';
import finnhub from 'finnhub';
import { getAllTreasuryYields } from '@/lib/alpha-vantage';

// Force dynamic rendering to handle external API rate limits and timeouts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Finnhub client
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY || '';
const finnhubClient = new finnhub.DefaultApi();

// Symbol mapping: Yahoo Finance symbols → Finnhub symbols (ETFs)
const SYMBOL_MAP: Record<string, string> = {
    '^GSPC': 'SPY',      // S&P 500 ETF
    '^IXIC': 'QQQ',      // Nasdaq ETF
    '^DJI': 'DIA',       // Dow Jones ETF
    '^VIX': 'VXX',       // VIX ETF
    '^TNX': 'IEF',       // 10Y Bond ETF
    '^TYX': 'TLT',       // 30Y Bond ETF
    'GC=F': 'GLD',       // Gold ETF
    'CL=F': 'USO',       // Oil ETF
    'BTC-USD': 'BITO',   // Bitcoin ETF
    'DX-Y.NYB': 'UUP',   // Dollar ETF
    // Sectors는 그대로 사용
};

// ETF-to-Index conversion multipliers
// These convert ETF prices to approximate index values
const INDEX_MULTIPLIERS: Record<string, number> = {
    '^GSPC': 10,    // SPY × 10 ≈ S&P 500 Index
    '^DJI': 100,    // DIA × 100 ≈ Dow Jones Index
    '^IXIC': 40,    // QQQ × 40 ≈ Nasdaq Composite (approximate)
    // Others use ETF price as-is
};

// Helper: Promise wrapper for Finnhub
function getQuote(symbol: string): Promise<any> {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (error: any, data: any, response: any) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

export async function GET() {

    const definitions = [
        // Indices (converted from ETF prices to index values)
        { symbol: '^GSPC', name: 'S&P 500', category: 'index', isIndex: true },
        { symbol: '^IXIC', name: '나스닥', category: 'index', isIndex: true },
        { symbol: '^DJI', name: '다우 존스', category: 'index', isIndex: true },
        { symbol: '^VIX', name: 'VIX', category: 'index' },

        // Treasury Yields (fetched from Alpha Vantage)
        { symbol: '^TNX', name: '미국채 10년', category: 'index', isTreasuryYield: true, maturity: '10year' },
        { symbol: '^TYX', name: '미국채 30년', category: 'index', isTreasuryYield: true, maturity: '30year' },

        // Macros
        { symbol: 'GC=F', name: '금 ETF (GLD)', category: 'macro' },  // Clearer label
        { symbol: 'CL=F', name: '원유 ETF (USO)', category: 'macro' },  // Clearer label
        { symbol: 'BTC-USD', name: '비트코인', category: 'macro' },
        { symbol: 'DX-Y.NYB', name: '달러인덱스', category: 'macro' },
        // Sectors (기존 심볼 그대로)
        { symbol: 'XLK', name: '테크', category: 'sector' },
        { symbol: 'XLF', name: '금융', category: 'sector' },
        { symbol: 'XLV', name: '헬스케어', category: 'sector' },
        { symbol: 'XLE', name: '에너지', category: 'sector' },
        { symbol: 'XLY', name: '임의소비재', category: 'sector' },
        { symbol: 'XLP', name: '필수소비재', category: 'sector' },
        { symbol: 'XLC', name: '커뮤니케이션', category: 'sector' },
        { symbol: 'XLI', name: '산업재', category: 'sector' },
        { symbol: 'XLU', name: '유틸리티', category: 'sector' },
        { symbol: 'XLB', name: '소재', category: 'sector' },
        { symbol: 'XLRE', name: '부동산', category: 'sector' }
    ];

    try {
        const results = [];

        // Fetch treasury yields from Alpha Vantage (in parallel)
        const treasuryYields = await getAllTreasuryYields();

        for (const item of definitions) {
            try {
                // Handle Treasury Yields separately (from Alpha Vantage)
                if (item.isTreasuryYield) {
                    const maturityKey = (item as any).maturity as '10year' | '30year';
                    const yieldValue = treasuryYields[maturityKey];

                    console.log(`[Treasury] ${item.name}: maturity=${maturityKey}, value=${yieldValue}`);

                    if (yieldValue !== null && yieldValue !== undefined) {
                        results.push({
                            name: item.name,
                            symbol: item.symbol,
                            category: item.category,
                            price: yieldValue,  // Yield as percentage (e.g., 4.21)
                            change: 0,  // Alpha Vantage doesn't provide daily change easily
                            isPositive: true,
                            timestamp: new Date().toISOString(),
                            marketState: 'REGULAR',
                            isTreasuryYield: true,  // Flag for UI to display as percentage
                        });
                    } else {
                        console.error(`[Treasury] ${item.name} FAILED: value=${yieldValue}`);
                        // Fallback error if Alpha Vantage fails
                        results.push({
                            name: item.name,
                            symbol: item.symbol,
                            category: item.category,
                            price: 0,
                            change: 0,
                            isPositive: true,
                            error: true,
                            errorMessage: 'Failed to fetch treasury yield',
                            timestamp: new Date().toISOString(),
                            marketState: 'UNKNOWN',
                        });
                    }
                    continue;  // Skip Finnhub processing for treasury yields
                }

                // Handle regular Finnhub data (indices, commodities, sectors)
                const finnhubSymbol = SYMBOL_MAP[item.symbol] || item.symbol;
                const quote = await getQuote(finnhubSymbol);

                // Finnhub response structure:
                // { c: current price, d: change, dp: percent change, h: high, l: low, o: open, pc: previous close, t: timestamp }

                // Convert ETF price to index value if multiplier exists
                const multiplier = INDEX_MULTIPLIERS[item.symbol] || 1;
                const convertedPrice = (quote.c || 0) * multiplier;

                // Round to 2 decimal places for indices
                const displayPrice = Math.round(convertedPrice * 100) / 100;

                results.push({
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    price: displayPrice,
                    change: quote.dp || 0,  // Percentage change stays the same
                    isPositive: (quote.dp || 0) >= 0,
                    timestamp: quote.t ? new Date(quote.t * 1000).toISOString() : new Date().toISOString(),
                    marketState: 'REGULAR', // Finnhub doesn't provide market state
                    // Add metadata for UI to show "ETF 기반" label
                    isEstimated: multiplier > 1,
                    etfSymbol: multiplier > 1 ? finnhubSymbol : undefined
                });

                // Rate limit protection (Finnhub: 60 calls/min, so 1 call/sec is safe)
                // Increased delay to 300ms to be safer against 429s in production
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err: any) {
                console.error(`Failed to fetch ${item.symbol}:`, err.message);
                results.push({
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    price: 0,
                    change: 0,
                    isPositive: true,
                    error: true,
                    errorMessage: err?.message || 'Failed to fetch data',
                    timestamp: new Date().toISOString(),
                    marketState: 'UNKNOWN'
                });
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Finnhub Global Error:", error);
        return NextResponse.json({
            error: 'Failed to fetch market data',
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
