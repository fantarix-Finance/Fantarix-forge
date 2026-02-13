import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const API_KEY = 'd5vdqlhr01qjj9jj5s8gd5vdqlhr01qjj9jj5s90';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        // Strategy: Fetch Quote (Current/Prev) and Metric (52W High/Low)
        // This is lighter and more reliable than fetching 1 year of candles
        const [quoteRes, metricRes] = await Promise.all([
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`, { next: { revalidate: 30 } }),
            fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`, { next: { revalidate: 3600 } })
        ]);

        // Handle Failures
        if (!quoteRes.ok) {
            const errText = await quoteRes.text();
            console.error(`Finnhub Quote Failed (${quoteRes.status}):Str`, errText);
            return NextResponse.json({ error: `Quote API Error: ${quoteRes.status}` }, { status: quoteRes.status });
        }

        // We treat Metric failure as non-critical (can fall back)
        const quoteData = await quoteRes.json();
        let metricData = { metric: { '52WeekHigh': 0, '52WeekLow': 0 } };

        if (metricRes.ok) {
            metricData = await metricRes.json();
        } else {
            console.warn(`Finnhub Metric Failed (${metricRes.status})`);
        }

        // Extract Data
        // Quote: c (Current), pc (Prev Close), h (High), l (Low)
        const current = quoteData.c || 0;
        const prevClose = quoteData.pc || 0;
        const dayHigh = quoteData.h || 0;
        const dayLow = quoteData.l || 0;

        // Metric: 52WeekHigh, 52WeekLow
        // Fallback: If metric is missing, use Day High/Low to avoid NaN (UI will show narrow range, better than crash)
        const high52 = metricData.metric?.['52WeekHigh'] || dayHigh || current * 1.1;
        const low52 = metricData.metric?.['52WeekLow'] || dayLow || current * 0.9;

        const range = high52 - low52;
        // Calc position %
        // Clamp between 0 and 100
        let position = range === 0 ? 50 : ((current - low52) / range) * 100;
        position = Math.max(0, Math.min(100, position));

        return NextResponse.json({
            high52,
            low52,
            current,
            prevClose,
            dayHigh,
            dayLow,
            position
        });

    } catch (error) {
        console.error("Server API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
