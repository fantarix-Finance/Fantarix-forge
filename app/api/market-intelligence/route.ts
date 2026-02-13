import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculate52WeekPosition } from '@/lib/fundamental-analysis';
import { GICS_SECTORS, getAllGICSSectors } from '@/lib/sector-database';
import { getFinnhubQuote, getStockMetrics } from '@/lib/finnhub-api';

// Configure for long-running process (due to rate limits)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Attempt to extend timeout to 60s (pro/hobby limit varies)

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
        // 1. Get current price from Finnhub quote
        const quote = await getFinnhubQuote(symbol);
        if (!quote) {
            console.log(`[Market Intelligence] Failed to get quote for ${symbol}`);
            return null;
        }

        // 2. Get 52-week data from Finnhub metrics
        try {
            const metrics = await getStockMetrics(symbol);
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
            console.error(`[Market Intelligence] Error getting metrics for ${symbol}:`, error.message);
            return null; // Fail gracefully for this specific stock
        }

    } catch (error: any) {
        console.error(`[Market Intelligence] Error fetching ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Market Intelligence API (Sector-Based)
 * Analyzes 11 GICS sectors using Finnhub, finds 3 weakest by 52-week position
 */
export async function GET(request: Request) {
    try {
        console.log('[Market Intelligence] Starting sector analysis with Finnhub...');

        // Step 1: Analyze all 11 sector ETFs
        const sectorKeys = getAllGICSSectors();
        const sectorAnalyses: Array<{
            sectorKey: string;
            position: number;
            data: any;
        }> = [];

        for (let i = 0; i < sectorKeys.length; i++) {
            const sectorKey = sectorKeys[i];
            const sectorInfo = GICS_SECTORS[sectorKey];

            // Rate limit protection - Finnhub: 60 calls/min = 1s delay is safe
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            try {
                console.log(`[Market Intelligence] Analyzing sector: ${sectorKey} (ETF: ${sectorInfo.etf})`);

                const stockData = await getStockData(sectorInfo.etf);

                if (!stockData) {
                    console.log(`[Market Intelligence] Skipping ${sectorInfo.etf} - no data`);
                    continue;
                }

                const position52Week = calculate52WeekPosition(
                    stockData.price,
                    stockData.fiftyTwoWeekHigh,
                    stockData.fiftyTwoWeekLow
                );

                sectorAnalyses.push({
                    sectorKey,
                    position: position52Week.position,
                    data: {
                        sectorInfo,
                        stockData,
                        position52Week
                    }
                });

                console.log(
                    `[Market Intelligence] ${sectorKey}: $${stockData.price.toFixed(2)}, ` +
                    `52W: $${stockData.fiftyTwoWeekLow.toFixed(2)}-$${stockData.fiftyTwoWeekHigh.toFixed(2)}, ` +
                    `position=${position52Week.position.toFixed(0)}%`
                );

            } catch (error: any) {
                console.error(`[Market Intelligence] Error analyzing sector ${sectorKey}:`, error.message);
            }
        }

        if (sectorAnalyses.length === 0) {
            throw new Error('No sector data could be fetched');
        }

        // Step 2: Sort by position (lowest = weakest = best opportunity)
        sectorAnalyses.sort((a, b) => a.position - b.position);

        // Step 3: Get top 3 weakest sectors
        const top3Weakest = sectorAnalyses.slice(0, 3);

        console.log(`[Market Intelligence] Top 3 weakest sectors:`,
            top3Weakest.map(s => `${s.sectorKey} (${(s.position * 100).toFixed(0)}%)`).join(', ')
        );

        // Step 4: Fetch stocks for each of the 3 sectors
        const opportunities: SectorOpportunity[] = [];

        for (const weakSector of top3Weakest) {
            const { sectorKey, data } = weakSector;
            const { sectorInfo, position52Week } = data;

            // Get top 2 stocks for this sector (reduced from 3 to save API calls/time)
            const topStocks = sectorInfo.stocks.slice(0, 2);
            const stockOpportunities: StockOpportunity[] = [];

            for (let i = 0; i < topStocks.length; i++) {
                const ticker = topStocks[i];

                // Rate limit - 1 second delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                try {
                    const stockData = await getStockData(ticker);

                    if (!stockData) {
                        console.log(`[Market Intelligence] Skipping stock ${ticker} - no data`);
                        continue;
                    }

                    const stockPosition = calculate52WeekPosition(
                        stockData.price,
                        stockData.fiftyTwoWeekHigh,
                        stockData.fiftyTwoWeekLow
                    );

                    stockOpportunities.push({
                        ticker,
                        name: stockData.name,
                        currentPrice: stockData.price,
                        position52Week: stockPosition
                    });

                    console.log(
                        `[Market Intelligence] ${ticker}: $${stockData.price.toFixed(2)}, ` +
                        `position=${stockPosition.position.toFixed(0)}%`
                    );

                } catch (error: any) {
                    console.error(`[Market Intelligence] Error fetching stock ${ticker}:`, error.message);
                }
            }

            opportunities.push({
                sectorKey,
                sectorEn: sectorInfo.sectorEn,
                sectorKo: sectorInfo.sectorKo,
                etf: sectorInfo.etf,
                position52Week,
                stocks: stockOpportunities
            });
        }

        // Step 5: Get AI analysis for the 3 sectors
        for (const opp of opportunities) {
            try {
                opp.aiAnalysis = await getSectorAIAnalysis(opp);
            } catch (error: any) {
                console.error(`[Market Intelligence] AI analysis failed for ${opp.sectorKo}:`, error.message);
                opp.aiAnalysis = 'AI 분석을 가져올 수 없습니다.';
            }
        }

        return NextResponse.json({
            success: true,
            analyzedAt: new Date().toISOString(),
            cacheExpiresAt: new Date(Date.now() + 28800 * 1000).toISOString(), // 8 hours from now
            totalSectorsAnalyzed: sectorAnalyses.length,
            weakestSectors: opportunities
        });

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

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();

    } catch (error: any) {
        console.error('[Market Intelligence] AI analysis error:', error);
        throw error;
    }
}
