import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculate52WeekPosition } from '@/lib/fundamental-analysis';
import { GICS_SECTORS, getAllGICSSectors } from '@/lib/sector-database';
import { getFinnhubQuote, getStockMetrics } from '@/lib/finnhub-api';

// ─── Caching Strategy ─────────────────────────────────────────────────────────
// Market Intelligence fetches 11 sector ETFs + stocks from Finnhub, then gets
// AI analysis. Sequential processing with 1s delays easily exceeds Vercel's
// function timeout (10s Hobby, 60s Pro).
//
// Solution: Server-side in-memory cache (8h TTL).
//   - Cache HIT  → instant response (< 1ms)
//   - Cache MISS → parallel Finnhub fetches (~3-5s), then AI analysis
//
// Note: maxDuration only works on Vercel Pro/Enterprise plans.
// On Hobby plan the hard limit is 10s, so we keep computation < 10s.

const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface CacheEntry {
    data: object;
    fetchedAt: number;
}

let intelligenceCache: CacheEntry | null = null;

function isCacheValid(): boolean {
    if (!intelligenceCache) return false;
    return Date.now() - intelligenceCache.fetchedAt < CACHE_TTL_MS;
}
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'; // Required for memory cache pattern

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Position52Week {
    position: number;
    fromHigh: number;
    fromLow: number;
    interpretation: string;
}

export interface StockOpportunity {
    ticker: string;
    name: string;
    currentPrice: number;
    position52Week: Position52Week;
}

export interface SectorOpportunity {
    sectorKey: string;
    sectorEn: string;
    sectorKo: string;
    etf: string;
    position52Week: Position52Week;
    stocks: StockOpportunity[];
    aiAnalysis?: string;
}

/**
 * Get comprehensive stock data using Finnhub only
 * Finnhub quote: Current price (fast, 60 calls/min)
 * Finnhub metrics: 52-week high/low (fast, 60 calls/min)
 */
async function getStockData(symbol: string): Promise<{
    symbol: string;
    price: number;
    name: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
} | null> {
    try {
        // Fetch quote and metrics in PARALLEL (no delay needed at 60 calls/min)
        const [quote, metrics] = await Promise.all([
            getFinnhubQuote(symbol),
            getStockMetrics(symbol),
        ]);

        if (!quote) {
            console.log(`[Market Intelligence] Failed to get quote for ${symbol}`);
            return null;
        }

        if (!metrics) {
            console.log(`[Market Intelligence] Failed to get metrics for ${symbol}`);
            return null;
        }

        return {
            symbol,
            price: quote.currentPrice,
            name: symbol,
            fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: metrics.fiftyTwoWeekLow
        };

    } catch (error: any) {
        console.error(`[Market Intelligence] Error fetching ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Market Intelligence API (Sector-Based, with memory cache)
 * Analyzes 11 GICS sectors using Finnhub, finds 3 weakest by 52-week position.
 * Results are cached 8 hours to stay within Vercel function timeout limits.
 */
export async function GET(request: Request) {
    // ── Return cached data if still valid ─────────────────────────────────────
    if (isCacheValid()) {
        console.log('[Market Intelligence] Cache HIT – returning cached data');
        return NextResponse.json(intelligenceCache!.data);
    }

    // ── Cache MISS: run full analysis ─────────────────────────────────────────
    try {
        console.log('[Market Intelligence] Cache MISS – starting parallel sector analysis...');

        const sectorKeys = getAllGICSSectors();

        // Step 1: Fetch ALL sector ETFs in PARALLEL (was sequential with 1s delays)
        const sectorPromises = sectorKeys.map(async (sectorKey) => {
            const sectorInfo = GICS_SECTORS[sectorKey];
            try {
                const stockData = await getStockData(sectorInfo.etf);
                if (!stockData) return null;

                const position52Week = calculate52WeekPosition(
                    stockData.price,
                    stockData.fiftyTwoWeekHigh,
                    stockData.fiftyTwoWeekLow
                );

                console.log(
                    `[Market Intelligence] ${sectorKey}: $${stockData.price.toFixed(2)}, ` +
                    `52W: $${stockData.fiftyTwoWeekLow.toFixed(2)}-$${stockData.fiftyTwoWeekHigh.toFixed(2)}, ` +
                    `position=${position52Week.position.toFixed(0)}%`
                );

                return { sectorKey, position: position52Week.position, data: { sectorInfo, stockData, position52Week } };
            } catch (error: any) {
                console.error(`[Market Intelligence] Error analyzing sector ${sectorKey}:`, error.message);
                return null;
            }
        });

        const rawResults = await Promise.all(sectorPromises);
        const sectorAnalyses = rawResults.filter(Boolean) as Array<{
            sectorKey: string; position: number; data: any;
        }>;

        if (sectorAnalyses.length === 0) {
            throw new Error('No sector data could be fetched');
        }

        // Step 2: Sort by 52-week position (lowest = weakest = best opportunity)
        sectorAnalyses.sort((a, b) => a.position - b.position);

        // Step 3: Get top 3 weakest sectors
        const top3Weakest = sectorAnalyses.slice(0, 3);
        console.log(`[Market Intelligence] Top 3 weakest sectors:`,
            top3Weakest.map(s => `${s.sectorKey} (${(s.position * 100).toFixed(0)}%)`).join(', ')
        );

        // Step 4: Fetch stocks for each of the 3 sectors in PARALLEL
        const opportunityPromises = top3Weakest.map(async ({ sectorKey, data }) => {
            const { sectorInfo, position52Week } = data;

            // Fetch top 2 stocks per sector, also in parallel
            const topStocks = sectorInfo.stocks.slice(0, 2);
            const stockPromises = topStocks.map(async (ticker: string) => {
                try {
                    const stockData = await getStockData(ticker);
                    if (!stockData) return null;

                    const stockPosition = calculate52WeekPosition(
                        stockData.price,
                        stockData.fiftyTwoWeekHigh,
                        stockData.fiftyTwoWeekLow
                    );

                    console.log(`[Market Intelligence] ${ticker}: $${stockData.price.toFixed(2)}, position=${stockPosition.position.toFixed(0)}%`);

                    return {
                        ticker,
                        name: stockData.name,
                        currentPrice: stockData.price,
                        position52Week: stockPosition
                    } as StockOpportunity;
                } catch (error: any) {
                    console.error(`[Market Intelligence] Error fetching stock ${ticker}:`, error.message);
                    return null;
                }
            });

            const stockResults = await Promise.all(stockPromises);
            const stockOpportunities = stockResults.filter(Boolean) as StockOpportunity[];

            return {
                sectorKey,
                sectorEn: sectorInfo.sectorEn,
                sectorKo: sectorInfo.sectorKo,
                etf: sectorInfo.etf,
                position52Week,
                stocks: stockOpportunities
            } as SectorOpportunity;
        });

        const opportunities = await Promise.all(opportunityPromises);

        // Step 5: AI analysis for the 3 sectors in PARALLEL
        // (Gemini flash-latest: 60 RPM, so 3 concurrent requests is fine)
        const aiPromises = opportunities.map(async (opp) => {
            try {
                opp.aiAnalysis = await getSectorAIAnalysis(opp);
            } catch (error: any) {
                console.error(`[Market Intelligence] AI analysis failed for ${opp.sectorKo}:`, error.message);
                opp.aiAnalysis = 'AI 분석을 가져올 수 없습니다.';
            }
            return opp;
        });

        const finalOpportunities = await Promise.all(aiPromises);

        const responseData = {
            success: true,
            analyzedAt: new Date().toISOString(),
            cacheExpiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
            totalSectorsAnalyzed: sectorAnalyses.length,
            weakestSectors: finalOpportunities,
            cached: false,
        };

        // Store in memory cache
        intelligenceCache = { data: responseData, fetchedAt: Date.now() };
        console.log('[Market Intelligence] Analysis complete. Cache updated (8h TTL).');

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('[Market Intelligence] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Get AI analysis for a sector
 */
async function getSectorAIAnalysis(sector: SectorOpportunity): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest'
        });

        const stocksSummary = sector.stocks.map(s =>
            `${s.name} (${s.ticker}): $${s.currentPrice.toFixed(2)}, 52주 ${s.position52Week.position.toFixed(0)}% 위치`
        ).join('\n');

        const prompt = `당신은 섹터 전문 애널리스트입니다. 다음 섹터에 대해 2-3문장으로 투자 기회를 분석해주세요.

섹터: ${sector.sectorKo} (${sector.sectorEn})
ETF: ${sector.etf}
52주 위치: ${sector.position52Week.position.toFixed(0)}% (고점 대비 ${sector.position52Week.fromHigh.toFixed(1)}%, 저점 대비 ${sector.position52Week.fromLow.toFixed(1)}%)

대표 주식:
${stocksSummary}

이 섹터가 현재 52주 저점 근처에 있는 이유와 투자 기회로서의 가치를 간결하게 설명해주세요. 한국어로 100자 이내로 작성하세요.`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            console.log(`[Market Intelligence] Gemini unavailable for ${sector.sectorKo}: ${error.message}`);
            return '현재 AI 분석 사용량이 많아 잠시 분석을 제공할 수 없습니다. (Quota Exceeded)';
        }

    } catch (error: any) {
        console.error('[Market Intelligence] AI analysis error:', error);
        return 'AI 분석 중 오류가 발생했습니다.';
    }
}
