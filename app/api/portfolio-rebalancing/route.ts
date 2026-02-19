import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
// Note: POST endpoints cannot use ISR. The 8-hour cache is managed client-side.

/**
 * AI Portfolio Rebalancing Recommendations
 * POST /api/portfolio-rebalancing
 * Body: { accounts: Account[], totalValue: number }
 */

interface Holding {
  id: string;
  name: string;
  qty: number;
  avgCost: number;
  currentPrice?: number;
}

interface Account {
  name: string;
  holdings: Holding[];
}

export async function POST(request: Request) {
  try {
    const { accounts, totalValue } = await request.json() as {
      accounts: Account[];
      totalValue: number;
    };

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: 'Invalid portfolio data' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest'  // Only v1beta compatible model, 20/day but cached
    });
    // Prepare portfolio data
    const portfolioData = accounts.map(acc => ({
      name: acc.name,
      holdings: acc.holdings.map(h => ({
        name: h.name,
        value: h.qty * (h.currentPrice || h.avgCost),
        percentage: ((h.qty * (h.currentPrice || h.avgCost)) / totalValue * 100).toFixed(1)
      }))
    }));

    const prompt = `당신은 퇴직연금 전문 재무 자문가입니다. 다음 포트폴리오의 리밸런싱을 제안해주세요.

**투자자 전략**:
- 3-Bucket: 배당주(패시브) + 채권(위기 탄약) + 성장주(액티브)
- **현재 문제**: 성장주 비중 부족
- 목표: 장기 복리 효과 극대화, 위기 대비 유연성 유지

**현재 포트폴리오** (₩${totalValue.toLocaleString()}):
${JSON.stringify(portfolioData, null, 2)}

**제안 요청**:
1. **목표 자산 배분** - 배당주/채권/성장주 비율
2. **구체적 액션** (3-5개):
   - 매도 추천 (무엇을, 얼마나, 왜)
   - 매수 추천 (무엇을, 대략 금액, 왜)
3. **예상 효과** - 리밸런싱 후 기대 효과

**응답 형식** (JSON only):
{
  "targetAllocation": {
    "dividendStocks": 40,
    "bonds": 35,
    "growthStocks": 25
  },
  "actions": [
    {
      "action": "SELL",
      "ticker": "453850.KS",
      "name": "ACE 미국30년국채",
      "amount": "일부 매도 (약 20%)",
      "reason": "채권 비중 축소, 성장주 자금 확보"
    },
    {
      "action": "BUY",
      "ticker": "ENPH (or Korean growth ETF)",
      "name": "성장주 ETF 또는 개별주",
      "estimatedAmount": "₩5,000,000",
      "reason": "성장주 비중 확대로 장기 수익률 개선"
    }
  ],
  "expectedImpact": "성장주 비중 확대로 장기 복리 효과 극대화, 위기 시 채권 매도 여력 유지"
}

**중요**: 순수 JSON만 반환하세요.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      jsonMatch = [responseText];
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    return NextResponse.json(recommendations);

  } catch (error: any) {
    console.error('AI Rebalancing Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate rebalancing recommendations'
    }, { status: 500 });
  }
}
