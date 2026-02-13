import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const revalidate = 28800; // Cache for 8 hours (consistent with market-intelligence)

// Initialize Gemini with correct model identifier
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',  // Only v1beta compatible model, 20/day but cached
});

interface EconomicData {
    cpi: number;
    cpiChange: number;
    unemployment: number;
    unemploymentChange: number;
}

interface MarketData {
    vix: number;
    sp500: number;
    sp500Change: number;
}

// Fetch economic data from FRED API
async function fetchEconomicData(): Promise<EconomicData> {
    const FRED_API_KEY = process.env.FRED_API_KEY;
    const baseUrl = 'https://api.stlouisfed.org/fred/series/observations';

    try {
        // Get CPI (Consumer Price Index)
        const cpiRes = await fetch(
            `${baseUrl}?series_id=CPIAUCSL&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`,
            { next: { revalidate: 3600 } }
        );
        const cpiData = await cpiRes.json();
        const currentCPI = parseFloat(cpiData.observations[0].value);
        const prevCPI = parseFloat(cpiData.observations[1].value);
        const cpiChange = ((currentCPI - prevCPI) / prevCPI) * 100;

        // Get Unemployment Rate
        const unemploymentRes = await fetch(
            `${baseUrl}?series_id=UNRATE&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`,
            { next: { revalidate: 3600 } }
        );
        const unemploymentData = await unemploymentRes.json();
        const currentUnemployment = parseFloat(unemploymentData.observations[0].value);
        const prevUnemployment = parseFloat(unemploymentData.observations[1].value);
        const unemploymentChange = currentUnemployment - prevUnemployment;

        return {
            cpi: currentCPI,
            cpiChange,
            unemployment: currentUnemployment,
            unemploymentChange
        };
    } catch (error) {
        console.error('FRED API error:', error);
        // Return fallback data
        return {
            cpi: 310.0,
            cpiChange: 0.3,
            unemployment: 4.0,
            unemploymentChange: 0.1
        };
    }
}

// Fetch market data from Finnhub
async function fetchMarketData(): Promise<MarketData> {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    try {
        // Get VIX (Volatility Index)
        const vixRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=^VIX&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const vixData = await vixRes.json();

        // Get S&P 500
        const sp500Res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=^GSPC&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const sp500Data = await sp500Res.json();

        return {
            vix: vixData.c || 15,
            sp500: sp500Data.c || 5000,
            sp500Change: sp500Data.dp || 0
        };
    } catch (error) {
        console.error('Finnhub API error:', error);
        return {
            vix: 15,
            sp500: 5000,
            sp500Change: 0
        };
    }
}

// Fetch recent market news
async function fetchMarketNews(): Promise<string> {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const newsData = await res.json();

        // Get top 5 headlines
        const headlines = newsData
            .slice(0, 5)
            .map((item: any) => item.headline)
            .join('\n- ');

        return headlines || '최근 뉴스 데이터 없음';
    } catch (error) {
        console.error('News fetch error:', error);
        return '뉴스 데이터를 가져올 수 없습니다';
    }
}

export async function GET() {
    try {
        // 1. Collect all data
        const [economicData, marketData, newsHeadlines] = await Promise.all([
            fetchEconomicData(),
            fetchMarketData(),
            fetchMarketNews()
        ]);

        // 2. Prepare prompt for Gemini
        const analysisPrompt = `당신은 거시경제 및 시장 리스크 분석 전문가입니다.

**최신 데이터 (실시간)**:

경제 지표:
- CPI (인플레이션): ${economicData.cpi.toFixed(1)} (전월 대비 ${economicData.cpiChange > 0 ? '+' : ''}${economicData.cpiChange.toFixed(2)}%)
- 실업률: ${economicData.unemployment.toFixed(1)}% (전월 대비 ${economicData.unemploymentChange > 0 ? '+' : ''}${economicData.unemploymentChange.toFixed(1)}%p)

시장 지표:
- VIX (변동성 지수): ${marketData.vix.toFixed(1)}
- S&P 500: ${marketData.sp500.toFixed(0)} (${marketData.sp500Change > 0 ? '+' : ''}${marketData.sp500Change.toFixed(2)}%)

최근 주요 뉴스:
${newsHeadlines}

---

**분석 요청**:
다음 4가지 카테고리별로 현재 시장 리스크를 분석하세요:

1. **거시경제 리스크**: 인플레이션, 경기침체, Fed 통화정책
2. ** 유동성 리스크**: 대형 IPO, 시장 자금 흐름, 신용 스프레드
3. **시스템 리스크**: 은행 시스템, 채권 시장, 금융 시스템
4. **지정학적 리스크**: 전쟁, 선거, 무역 분쟁

각 카테고리에서 가장 중요한 리스크 1-2개를 식별하고, 다음 형식의 JSON 배열로 반환하세요:

[
  {
    "id": "unique-id",
    "category": "거시경제" | "유동성" | "시스템" | "지정학",
    "level": "위험 (High)" | "주의 (Medium)" | "안정 (Low)",
    "title": "리스크 제목 (15자 이내)",
    "summary": "2-3문장으로 요약 (100자 이내). 구체적인 수치와 영향 포함.",
    "confidence": 숫자 (0-100, 분석의 확신도)
  }
]

**중요**: 
- 반드시 유효한 JSON 형식만 반환하세요
- 리스크가 없으면 "안정 (Low)" 수준으로 표시하세요
- 각 카테고리당 최소 1개씩 반환하세요
- 총 4-6개의 리스크 항목을 반환하세요`;

        // 3. Call Gemini API
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        let analysisText = response.text();

        // Clean up response (remove markdown code blocks if present)
        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // 4. Parse JSON response
        let risks;
        try {
            risks = JSON.parse(analysisText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw response:', analysisText);

            // Fallback to structured dummy data if parsing fails
            risks = [
                {
                    id: "r1",
                    category: "거시경제",
                    level: "주의 (Medium)",
                    title: "AI 분석 중 오류 발생",
                    summary: "Gemini AI 응답 파싱 실패. 시스템 관리자에게 문의하세요.",
                    confidence: 0
                }
            ];
        }

        // 5. Add metadata
        const now = new Date();
        const updateTime = now.toISOString();

        return NextResponse.json({
            risks,
            metadata: {
                updateTime,
                cacheExpiresAt: new Date(Date.now() + 28800 * 1000).toISOString(), // 8 hours from now
                source: 'Gemini Pro AI Analysis',
                dataPoints: {
                    economic: economicData,
                    market: marketData
                }
            }
        });

    } catch (error: any) {
        console.error('Risk analysis error:', error);

        return NextResponse.json({
            error: 'Risk analysis failed',
            message: error.message,
            risks: []
        }, { status: 500 });
    }
}
