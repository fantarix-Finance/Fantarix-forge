import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',  // Only v1beta compatible model, 20/day but cached
});

// Universe of assets to scan for opportunities
const UNIVERSE = [
    { ticker: 'SMH', name: 'Semiconductor', sector: 'Technology' },
    { ticker: 'TAN', name: 'Solar Energy', sector: 'Clean Energy' },
    { ticker: 'URA', name: 'Uranium', sector: 'Energy' },
    { ticker: 'XLE', name: 'Energy', sector: 'Energy' },
    { ticker: 'XLV', name: 'Healthcare', sector: 'Healthcare' },
    { ticker: 'KWEB', name: 'China Internet', sector: 'Technology' },
    { ticker: 'ARKK', name: 'Innovation', sector: 'Technology' },
    { ticker: 'JETS', name: 'Airlines', sector: 'Transportation' },
    { ticker: 'BITO', name: 'Bitcoin Strategy', sector: 'Crypto' },
    { ticker: 'XBI', name: 'Biotech', sector: 'Healthcare' },
    { ticker: 'ICLN', name: 'Clean Energy', sector: 'Clean Energy' }
];

interface FundamentalData {
    ticker: string;
    name: string;
    sector: string;
    // Price metrics
    currentPrice: number;
    high52: number;
    low52: number;
    drawdown: number; // % from 52-week high
    // Fundamental metrics
    peRatio?: number;
    pbRatio?: number;
    roe?: number;
    marketCap?: number;
    // News
    recentNews: string[];
}

// Fetch fundamental data for a ticker
async function fetchFundamentals(ticker: string, name: string, sector: string): Promise<FundamentalData | null> {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    try {
        // Get basic metrics
        const metricRes = await fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const metricData = await metricRes.json();
        const metric = metricData.metric;

        if (!metric || !metric['52WeekHigh'] || !metric['52WeekLow']) {
            return null;
        }

        // Get current price from quote
        const quoteRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const quoteData = await quoteRes.json();
        const currentPrice = quoteData.c || 0;

        if (currentPrice === 0) return null;

        const high52 = metric['52WeekHigh'];
        const low52 = metric['52WeekLow'];
        const drawdown = ((high52 - currentPrice) / high52) * 100;

        // Get recent news (last 7 days)
        const now = new Date();
        const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const newsRes = await fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${formatDate(weekAgo)}&to=${formatDate(now)}&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const newsData = await newsRes.json();
        const recentNews = newsData
            .slice(0, 3)
            .map((item: any) => item.headline)
            .filter(Boolean);

        return {
            ticker,
            name,
            sector,
            currentPrice,
            high52,
            low52,
            drawdown,
            peRatio: metric.peNormalizedAnnual,
            pbRatio: metric.pbAnnual,
            roe: metric.roeTTM,
            marketCap: metric.marketCapitalization,
            recentNews
        };

    } catch (error) {
        console.error(`Failed to fetch fundamentals for ${ticker}:`, error);
        return null;
    }
}

// Use Gemini to analyze opportunity
async function analyzeOpportunity(fundamentals: FundamentalData): Promise<any | null> {
    try {
        const prompt = `당신은 가치투자 및 턴어라운드 투자 전문가입니다.

**자산 분석 요청**:

기본 정보:
- 종목: ${fundamentals.name} (${fundamentals.ticker})
- 섹터: ${fundamentals.sector}

가격 지표:
- 현재가: $${fundamentals.currentPrice.toFixed(2)}
- 52주 최고가: $${fundamentals.high52.toFixed(2)}
- 52주 최저가: $${fundamentals.low52.toFixed(2)}
- 고점 대비 하락폭: ${fundamentals.drawdown.toFixed(1)}%

펀더멘털 지표:
- P/E Ratio: ${fundamentals.peRatio?.toFixed(1) || 'N/A'}
- P/B Ratio: ${fundamentals.pbRatio?.toFixed(1) || 'N/A'}
- ROE: ${fundamentals.roe?.toFixed(1) || 'N/A'}%
- 시가총액: $${(fundamentals.marketCap || 0).toFixed(0)}B

최근 뉴스 (7일):
${fundamentals.recentNews.length > 0 ? fundamentals.recentNews.map((n, i) => `${i + 1}. ${n}`).join('\n') : '뉴스 없음'}

---

**분석 요청**:

다음 기준으로 투자 기회를 평가하세요:

1. **저평가 여부**: P/E, P/B가 역사적/섹터 평균 대비 낮은가?
2. **펀더멘털 건전성**: ROE, 성장성, 재무 건전성은?
3. **단기 이슈 vs 구조적 문제**: 최근 뉴스와 하락이 일시적 이슈인가, 구조적 문제인가?
4. **턴어라운드 가능성**: 회복 가능성과 촉매제는?

다음 JSON 형식으로 반환하세요:

{
  "isOpportunity": true | false,
  "type": "저평가" | "턴어라운드" | "성장" | "회피",
  "score": 0-100 (투자 매력도),
  "thesis": "2-3문장 투자 논리",
  "catalysts": ["촉매1", "촉매2"],
  "risks": ["리스크1", "리스크2"],
  "riskLevel": "Low" | "Medium" | "High",
  "confidence": 0-100
}

**중요**: 
- 반드시 유효한 JSON만 반환
- 고점 대비 30% 이상 하락했어도 구조적 문제가 있다면 isOpportunity = false
- 펀더멘털이 견고하고 단기 이슈라면 isOpportunity = true`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let analysisText = response.text();

        // Clean up response
        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const analysis = JSON.parse(analysisText);

        // Only return if it's a real opportunity
        if (!analysis.isOpportunity) {
            return null;
        }

        return {
            id: fundamentals.ticker.toLowerCase(),
            title: `${fundamentals.name} (${fundamentals.ticker})`,
            theme: analysis.type,
            mainTicker: fundamentals.ticker,
            etfs: [fundamentals.ticker],
            thesis: analysis.thesis,
            catalysts: analysis.catalysts || [],
            riskLevel: analysis.riskLevel || 'Medium',
            isAuto: true,
            aiScore: analysis.score,
            confidence: analysis.confidence,
            fundamentals: {
                pe: fundamentals.peRatio,
                pb: fundamentals.pbRatio,
                roe: fundamentals.roe,
                drawdown: fundamentals.drawdown
            }
        };

    } catch (error) {
        console.error(`AI analysis failed for ${fundamentals.ticker}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        const opportunities: any[] = [];

        // Scan all assets in parallel
        const fundamentalsPromises = UNIVERSE.map(asset =>
            fetchFundamentals(asset.ticker, asset.name, asset.sector)
        );

        const fundamentalsResults = await Promise.allSettled(fundamentalsPromises);

        // Filter for assets with significant drawdowns (>20%)
        const candidates: FundamentalData[] = [];
        for (const result of fundamentalsResults) {
            if (result.status === 'fulfilled' && result.value && result.value.drawdown > 20) {
                candidates.push(result.value);
            }
        }

        // Analyze top candidates with Gemini (limit to 5 to avoid rate limits)
        const topCandidates = candidates
            .sort((a, b) => b.drawdown - a.drawdown)
            .slice(0, 5);

        for (const candidate of topCandidates) {
            const opportunity = await analyzeOpportunity(candidate);
            if (opportunity) {
                opportunities.push(opportunity);
            }
        }

        // Return opportunities sorted by AI score
        const sorted = opportunities.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

        return NextResponse.json({
            opportunities: sorted,
            scanned: UNIVERSE.length,
            candidates: candidates.length,
            identified: sorted.length
        });

    } catch (error: any) {
        console.error('Market scanner error:', error);
        return NextResponse.json({
            opportunities: [],
            error: error.message
        }, { status: 500 });
    }
}
