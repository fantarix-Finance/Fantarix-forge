import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const revalidate = 28800; // Cache for 8 hours (consistent with other AI features)

/**
 * AI Portfolio Analysis
 * Analyzes portfolio composition, risks, and provides recommendations
 * POST /api/portfolio-analysis
 * Body: { accounts: Account[], totalValue: number, totalInvested: number }
 */
export async function POST(request: Request) {
    try {
        const { accounts, totalValue, totalInvested } = await request.json();

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

        // Prepare portfolio summary for AI
        const portfolioSummary = accounts.map(acc => ({
            name: acc.name,
            value: acc.holdings.reduce((sum, h) => sum + ((h.currentPrice || h.avgCost) * h.qty), 0),
            holdings: acc.holdings.map(h => ({
                name: h.name,
                ticker: h.id,
                qty: h.qty,
                avgCost: h.avgCost,
                currentPrice: h.currentPrice || h.avgCost,
                value: h.qty * (h.currentPrice || h.avgCost)
            }))
        }));

        const prompt = `당신은 퇴직연금 전문 재무 분석가입니다. 다음 포트폴리오를 분석해주세요.

**투자자 프로필**:
- 계좌 유형: 퇴직연금 (장기 투자, 10년+ 시계)
- 투자 철학: 3-Bucket 전략
  1. 배당주 (패시브): 안정적 현금흐름 + 배당금 재투자 복리효과
  2. 안전자산 (채권): 위기 시 현금화할 "탄약" (폭락장에서 저렴한 주식 매수용)
  3. 성장주 (액티브): **현재 부족** - 저평가/일시적 악재 종목 기회 포착
- 현재 전략: 채권은 금리 하락기 수익 + 위기 대비용, 성장주 비중 확대 필요

**포트폴리오 현황**:
총 평가액: ₩${totalValue.toLocaleString()}
총 투자액: ₩${totalInvested.toLocaleString()}
수익률: ${(((totalValue - totalInvested) / totalInvested) * 100).toFixed(2)}%

${JSON.stringify(portfolioSummary, null, 2)}

**분석 요청 사항**:
1. **리스크 레벨** (High/Medium/Low) - 현재 포트폴리오의 전체적인 리스크
2. **포트폴리오 건강도 점수** (0-100) - 투자 목표 대비 적정성
3. **자산 배분 분석**:
   - 배당주 비중 (%)
   - 안전자산(채권) 비중 (%)
   - 성장주 비중 (%) - **부족 지적 필요**
4. **집중 리스크** - 특정 섹터/지역/자산에 과도하게 편중되었는지
5. **강점** (2-3개)
6. **개선 제안** (2-3개) - 특히 성장주 추천 **구체적으로**
7. **전반적 분석 코멘트** (3-4문장)

**응답 형식** (반드시 JSON으로만):
{
  "riskLevel": "Medium",
  "healthScore": 75,
  "assetAllocation": {
    "dividendStocks": 50,
    "bonds": 40,
    "growthStocks": 10
  },
  "concentrationRisks": ["미국 시장 집중 (70%)", "채권 비중 과다 (40%)"],
  "strengths": ["안정적 배당 수익", "환헤지 적용"],
  "recommendations": ["성장주 비중 10% → 25%로 확대 권장: ENPH, CRM 등 저평가 성장주 고려", "신흥시장 분산 검토"],
  "analysis": "전체 포트폴리오는 안정적이나 성장 잠재력이 부족합니다. 퇴직연금으로 장기 투자 시계를 고려하면 성장주 비중을 확대하여 복리 효과를 극대화할 필요가 있습니다. 채권은 위기 대비용으로 적정하며, Opportunity Radar를 통해 저평가 성장주를 지속적으로 포착하는 전략이 효과적입니다."
}

**중요**: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 설명 텍스트 없이 순수 JSON만 반환하세요.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log('[AI Analysis] Gemini response length:', responseText.length);
        console.log('[AI Analysis] First 300 chars:', responseText.substring(0, 300));

        // Extract JSON from response (handle markdown code blocks)
        let jsonText = responseText.trim();

        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Try to extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI Analysis] No JSON found in response');
            return NextResponse.json({
                error: 'Invalid AI response format - no JSON found',
                preview: responseText.substring(0, 200)
            }, { status: 500 });
        }

        let analysis;
        try {
            analysis = JSON.parse(jsonMatch[0]);
            console.log('[AI Analysis] Successfully parsed JSON');
        } catch (parseError: any) {
            console.error('[AI Analysis] JSON parse error:', parseError.message);
            console.error('[AI Analysis] Failed JSON:', jsonMatch[0].substring(0, 300));
            return NextResponse.json({
                error: 'Failed to parse AI response',
                parseError: parseError.message,
                jsonPreview: jsonMatch[0].substring(0, 200)
            }, { status: 500 });
        }

        // Validate required fields
        const requiredFields = ['riskLevel', 'healthScore', 'assetAllocation', 'concentrationRisks', 'strengths', 'recommendations', 'analysis'];
        const missingFields = requiredFields.filter(field => !(field in analysis));

        if (missingFields.length > 0) {
            console.error('[AI Analysis] Missing fields:', missingFields);
            return NextResponse.json({
                error: 'Incomplete AI analysis',
                missingFields,
                receivedFields: Object.keys(analysis)
            }, { status: 500 });
        }

        console.log('[AI Analysis] Validation passed, returning analysis');
        return NextResponse.json({
            ...analysis,
            cacheExpiresAt: new Date(Date.now() + 28800 * 1000).toISOString(), // 8 hours from now
            analyzedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[AI Analysis] Unexpected error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to analyze portfolio',
            details: error.toString(),
            stack: error.stack?.substring(0, 500)
        }, { status: 500 });
    }
}
