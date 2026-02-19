/**
 * Alpha Vantage API Client
 * 
 * Fetches Treasury Yield data and Stock Overview (52-week high/low) from Alpha Vantage API
 * 
 * **Caching Strategy**:
 * - Server-side in-memory cache with 1-hour TTL
 * - First request or cache-miss: real API call (sequential, 13s delay for rate limits)
 * - Cache hits: instant response (< 1ms)
 * - Alpha Vantage free plan: 25 calls/day, 5 calls/min (13s delay = safe margin)
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

// ─── Server Memory Cache ──────────────────────────────────────────────────────
const TREASURY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TreasuryCacheEntry {
    '10year': number | null;
    '10yearChange': number;
    '10yearDate': string | null;
    '30year': number | null;
    '30yearChange': number;
    '30yearDate': string | null;
    fetchedAt: number;
}

let treasuryCache: TreasuryCacheEntry | null = null;

function isCacheValid(): boolean {
    if (!treasuryCache) return false;
    return Date.now() - treasuryCache.fetchedAt < TREASURY_CACHE_TTL_MS;
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the latest Treasury Yield and Change from Alpha Vantage
 * 
 * @param maturity - '10year' or '30year'
 * @returns Object with yield, change, and previousClose, or null if no data
 */
export async function getTreasuryYield(maturity: TreasuryMaturity): Promise<{ value: number; change: number; date: string } | null> {
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
 * Get both 10-year and 30-year treasury yields.
 *
 * Uses server-side memory cache (1h TTL) to avoid the 13-second sequential
 * delay on every request. Only fetches from Alpha Vantage on cache miss.
 *
 * If Alpha Vantage returns null for ALL values (rate limit), the result is
 * cached for only 5 minutes so the next request retries sooner.
 *
 * @returns Object with both yields, or null values for failed fetches
 */
export async function getAllTreasuryYields() {
    // ── Cache HIT: return immediately ─────────────────────────────────────────
    if (isCacheValid()) {
        console.log('[Alpha Vantage] getAllTreasuryYields: Cache HIT, returning cached data');
        return treasuryCache!;
    }

    // ── Cache MISS: fetch from Alpha Vantage ──────────────────────────────────
    console.log('[Alpha Vantage] getAllTreasuryYields: Cache MISS - starting sequential fetch');

    const tenYearData = await getTreasuryYield('10year');
    console.log(`[Alpha Vantage] 10-year result = ${JSON.stringify(tenYearData)}`);

    // Wait 13 seconds to respect rate limit (Alpha Vantage: 5 calls/minute)
    console.log('[Alpha Vantage] Waiting 13 seconds for rate limit...');
    await new Promise(resolve => setTimeout(resolve, 13000));

    const thirtyYearData = await getTreasuryYield('30year');
    console.log(`[Alpha Vantage] 30-year result = ${JSON.stringify(thirtyYearData)}`);

    const bothNull = !tenYearData && !thirtyYearData;

    const result: TreasuryCacheEntry = {
        '10year': tenYearData ? tenYearData.value : null,
        '10yearChange': tenYearData ? tenYearData.change : 0,
        '10yearDate': tenYearData ? tenYearData.date : null,
        '30year': thirtyYearData ? thirtyYearData.value : null,
        '30yearChange': thirtyYearData ? thirtyYearData.change : 0,
        '30yearDate': thirtyYearData ? thirtyYearData.date : null,
        // Both null = likely rate-limited: set fetchedAt back so cache expires in 5min instead of 1h
        fetchedAt: bothNull
            ? Date.now() - (TREASURY_CACHE_TTL_MS - 5 * 60 * 1000)
            : Date.now(),
    };

    treasuryCache = result;

    if (bothNull) {
        console.warn('[Alpha Vantage] Both yields null (rate limited?). Cache TTL shortened to 5 min.');
    } else {
        console.log('[Alpha Vantage] Cache updated. Next fetch in 1 hour.');
    }
    console.log('[Alpha Vantage] Final result:', result);

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
