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
 * Get the latest Treasury Yield and Change from Alpha Vantage
 * 
 * @param maturity - '10year' or '30year'
 * @returns Object with yield, change, and previousClose, or null if no data
 */
export async function getTreasuryYield(maturity: TreasuryMaturity): Promise<{ value: number; change: number } | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    console.log(`[Alpha Vantage] Starting ${maturity} fetch, API key exists: ${!!apiKey}`);

    if (!apiKey) {
        console.error('[Alpha Vantage] API key not configured');
        return null;
    }

    try {
        const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${apiKey}`;
        console.log(`[Alpha Vantage] Fetching ${maturity} from URL (key hidden)`);

        // Enable caching (1 hour) to support ISR and avoid rate limits/timeouts
        const response = await fetch(url, {
            next: { revalidate: 3600 }
        });

        console.log(`[Alpha Vantage] ${maturity} response status: ${response.status}`);

        if (!response.ok) {
            console.error(`[Alpha Vantage] HTTP error: ${response.status}`);
            return null;
        }

        const text = await response.text();

        let data: TreasuryYieldResponse;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`[Alpha Vantage] ${maturity} JSON parse error:`, e);
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
            return null;
        }

        // Get latest and previous data points
        const latestData = data.data[0];
        const previousData = data.data[1]; // The day before

        const latestYield = parseFloat(latestData.value);
        let change = 0;

        if (previousData) {
            const previousYield = parseFloat(previousData.value);
            // Calculate point change (e.g. 4.25 - 4.20 = 0.05)
            // For yields, change is usually displayed in basis points or raw diff, not percent change of the rate.
            // But dashboard expects "change" and "changePercent"? 
            // Usually for dashboard: 
            // "Price" = 4.25
            // "Change" = +0.05 (value diff)
            // "ChangePercent" = (+0.05 / 4.20) * 100

            if (!isNaN(previousYield) && previousYield !== 0) {
                change = latestYield - previousYield;
            }
        }

        console.log(`[Alpha Vantage] ${maturity} SUCCESS: ${latestYield}% (Change: ${change.toFixed(2)})`);

        if (isNaN(latestYield)) {
            console.error(`[Alpha Vantage] ${maturity} invalid yield value:`, latestData.value);
            return null;
        }

        return { value: latestYield, change, date: latestData.date };

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
    const tenYearData = await getTreasuryYield('10year');
    console.log(`[Alpha Vantage] getAllTreasuryYields: 10-year result = ${JSON.stringify(tenYearData)}`);

    // Wait 13 seconds to avoid rate limit (Alpha Vantage: 5 calls/minute = 12 sec minimum)
    console.log('[Alpha Vantage] getAllTreasuryYields: Waiting 13 seconds...');
    await new Promise(resolve => setTimeout(resolve, 13000));

    // Call 30-year second
    const thirtyYearData = await getTreasuryYield('30year');
    console.log(`[Alpha Vantage] getAllTreasuryYields: 30-year result = ${JSON.stringify(thirtyYearData)}`);

    const result = {
        '10year': tenYearData ? tenYearData.value : null,
        '10yearChange': tenYearData ? tenYearData.change : 0,
        '10yearDate': tenYearData ? tenYearData.date : null,
        '30year': thirtyYearData ? thirtyYearData.value : null,
        '30yearChange': thirtyYearData ? thirtyYearData.change : 0,
        '30yearDate': thirtyYearData ? thirtyYearData.date : null
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
            next: { revalidate: 3600 }
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
