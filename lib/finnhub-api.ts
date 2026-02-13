/**
 * Finnhub API Client
 * Provides real-time stock quotes
 */

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
    symbol: string;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    timestamp: number;
}

export interface FinnhubMetrics {
    symbol: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    marketCap: number;
}

/**
 * Get basic financials including 52-week high/low from Finnhub
 * @param symbol - Stock symbol (e.g., 'AAPL', 'XLK')
 */
export async function getStockMetrics(symbol: string): Promise<FinnhubMetrics | null> {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        console.error('[Finnhub] API key not configured');
        return null;
    }

    try {
        const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`;
        const response = await fetch(url, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Check if metric data exists
        if (!data.metric || !data.metric['52WeekHigh'] || !data.metric['52WeekLow']) {
            console.error(`[Finnhub] Missing 52-week data for ${symbol}`);
            return null;
        }

        return {
            symbol,
            fiftyTwoWeekHigh: data.metric['52WeekHigh'],
            fiftyTwoWeekLow: data.metric['52WeekLow'],
            marketCap: data.metric['marketCapitalization'] || 0
        };
    } catch (error: any) {
        console.error(`[Finnhub] Error fetching metrics for ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Get real-time quote from Finnhub
 * @param symbol - Stock symbol (e.g., 'AAPL', 'XLK')
 */
export async function getFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        console.error('[Finnhub] API key not configured');
        return null;
    }

    try {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`;
        const response = await fetch(url, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Finnhub returns 0s if symbol not found
        if (data.c === 0 && data.pc === 0) {
            console.error(`[Finnhub] Symbol not found: ${symbol}`);
            return null;
        }

        return {
            symbol,
            currentPrice: data.c,      // current price
            previousClose: data.pc,    // previous close
            change: data.d,            // change
            changePercent: data.dp,    // percent change
            high: data.h,              // day high
            low: data.l,               // day low
            open: data.o,              // day open
            timestamp: data.t          // timestamp
        };
    } catch (error: any) {
        console.error(`[Finnhub] Error fetching quote for ${symbol}:`, error.message);
        return null;
    }
}
