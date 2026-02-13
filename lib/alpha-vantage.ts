/**
 * Alpha Vantage API Client
 * 
 * Fetches Treasury Yield data and Stock Overview (52-week high/low) from Alpha Vantage API
 */

export type TreasuryMaturity = '10year' | '30year';

interface TreasuryYieldData {
    date: string;
    value: string;
}

interface TreasuryYieldResponse {
    name: string;
    interval: string;
    unit: string;
    data: TreasuryYieldData[];
}

/**
 * Get the latest Treasury Yield from Alpha Vantage
 * 
 * @param maturity - '10year' or '30year'
 * @returns Latest yield as a number (e.g., 4.21), or null if no data
 */
export async function getTreasuryYield(maturity: TreasuryMaturity): Promise<number | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    console.log(`[Alpha Vantage] Starting ${maturity} fetch, API key exists: ${!!apiKey}`);

    if (!apiKey) {
        console.error('[Alpha Vantage] API key not configured');
        return null;
    }

    try {
        const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${apiKey}`;
        console.log(`[Alpha Vantage] Fetching ${maturity} from URL (key hidden)`);

        // REMOVED Next.js caching - it may cause issues in API routes
        const response = await fetch(url, {
            cache: 'no-store'  // Disable caching for now to debug
        });

        console.log(`[Alpha Vantage] ${maturity} response status: ${response.status}`);

        if (!response.ok) {
            console.error(`[Alpha Vantage] HTTP error: ${response.status}`);
            return null;
        }

        const text = await response.text();
        console.log(`[Alpha Vantage] ${maturity} response length: ${text.length} bytes`);

        let data: TreasuryYieldResponse;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`[Alpha Vantage] ${maturity} JSON parse error:`, e);
            console.error(`[Alpha Vantage] ${maturity} raw response:`, text.substring(0, 500));
            return null;
        }

        // Check for rate limit message
        if ((data as any).Note) {
            console.error(`[Alpha Vantage] ${maturity} rate limit:`, (data as any).Note);
            return null;
        }

        // Check if we got valid data
        if (!data.data || data.data.length === 0) {
            console.error(`[Alpha Vantage] ${maturity} no treasury yield data returned`);
            console.error(`[Alpha Vantage] ${maturity} response keys:`, Object.keys(data));
            return null;
        }

        // Return the most recent yield value
        const latestYield = parseFloat(data.data[0].value);

        console.log(`[Alpha Vantage] ${maturity} SUCCESS: ${latestYield}% (date: ${data.data[0].date})`);

        if (isNaN(latestYield)) {
            console.error(`[Alpha Vantage] ${maturity} invalid yield value:`, data.data[0].value);
            return null;
        }

        return latestYield;

    } catch (error) {
        console.error(`[Alpha Vantage] Error fetching ${maturity} treasury yield:`, error);
        return null;
    }
}

/**
 * Get both 10-year and 30-year treasury yields
 * Calls sequentially with delay to avoid rate limiting
 * 
 * @returns Object with both yields, or null for failed fetches
 */
export async function getAllTreasuryYields() {
    console.log('[Alpha Vantage] getAllTreasuryYields: Starting sequential fetch');

    // Call 10-year first
    const tenYear = await getTreasuryYield('10year');
    console.log(`[Alpha Vantage] getAllTreasuryYields: 10-year result = ${tenYear}`);

    // Wait 13 seconds to avoid rate limit (Alpha Vantage: 5 calls/minute = 12 sec minimum)
    console.log('[Alpha Vantage] getAllTreasuryYields: Waiting 13 seconds...');
    await new Promise(resolve => setTimeout(resolve, 13000));

    // Call 30-year second
    const thirtyYear = await getTreasuryYield('30year');
    console.log(`[Alpha Vantage] getAllTreasuryYields: 30-year result = ${thirtyYear}`);

    const result = {
        '10year': tenYear,
        '30year': thirtyYear
    };

    console.log('[Alpha Vantage] getAllTreasuryYields: Final result:', result);

    return result;
}

export interface StockOverview {
    symbol: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    marketCap: number;
    name: string;
}

/**
 * Get stock overview data including 52-week high/low
 * 
 * @param symbol - Stock symbol (e.g., 'AAPL', 'XLK')
 * @returns Stock overview data or null if failed
 */
export async function getStockOverview(symbol: string): Promise<StockOverview | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        console.error('[Alpha Vantage] API key not configured');
        return null;
    }

    try {
        const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
        const response = await fetch(url, {
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`[Alpha Vantage] HTTP error for ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Check for rate limit or errors
        if (data.Note || data['Error Message']) {
            console.error(`[Alpha Vantage] Error for ${symbol}:`, data.Note || data['Error Message']);
            return null;
        }

        // Check if data exists
        if (!data['52WeekHigh'] || !data['52WeekLow']) {
            console.error(`[Alpha Vantage] Missing 52-week data for ${symbol}`);
            return null;
        }

        const high = parseFloat(data['52WeekHigh']);
        const low = parseFloat(data['52WeekLow']);
        const marketCap = parseFloat(data['MarketCapitalization']) || 0;

        if (isNaN(high) || isNaN(low)) {
            console.error(`[Alpha Vantage] Invalid 52-week data for ${symbol}`);
            return null;
        }

        return {
            symbol,
            fiftyTwoWeekHigh: high,
            fiftyTwoWeekLow: low,
            marketCap,
            name: data['Name'] || symbol
        };

    } catch (error: any) {
        console.error(`[Alpha Vantage] Error fetching overview for ${symbol}:`, error.message);
        return null;
    }
}
