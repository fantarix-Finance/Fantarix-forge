import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

/**
 * Get fundamental metrics for a ticker
 * Returns: P/E, P/B, ROE, drawdown
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    try {
        // Fetch basic metrics
        const metricRes = await fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const metricData = await metricRes.json();
        const metric = metricData.metric;

        if (!metric) {
            return NextResponse.json({
                pe: null,
                pb: null,
                roe: null,
                drawdown: null,
                error: 'No metric data available'
            });
        }

        // Get current price from quote
        const quoteRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 3600 } }
        );
        const quoteData = await quoteRes.json();
        const currentPrice = quoteData.c || 0;

        // Calculate drawdown
        const high52 = metric['52WeekHigh'];
        const drawdown = (high52 && currentPrice)
            ? ((high52 - currentPrice) / high52) * 100
            : null;

        return NextResponse.json({
            pe: metric.peNormalizedAnnual || null,
            pb: metric.pbAnnual || null,
            roe: metric.roeTTM || null,
            drawdown: drawdown,
            currentPrice: currentPrice,
            high52: high52,
            low52: metric['52WeekLow']
        });

    } catch (error: any) {
        console.error(`Failed to fetch fundamentals for ${symbol}:`, error);
        return NextResponse.json({
            pe: null,
            pb: null,
            roe: null,
            drawdown: null,
            error: error.message
        }, { status: 500 });
    }
}
