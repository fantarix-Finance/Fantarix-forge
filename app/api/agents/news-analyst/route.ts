import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const API_KEY = 'd5vdqlhr01qjj9jj5s8gd5vdqlhr01qjj9jj5s90';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    // Get news for the last 14 days
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    try {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${formatDate(twoWeeksAgo)}&to=${formatDate(now)}&token=${API_KEY}`;

        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error(`Finnhub status: ${res.status}`);

        const data = await res.json();

        // Filter and format news
        // Finnhub returns: { category, datetime, headline, id, image, related, source, summary, url }
        const news = data
            .filter((item: any) => item.headline && item.source)
            .slice(0, 5) // Return top 5 recent news
            .map((item: any) => ({
                id: item.id,
                headline: item.headline,
                source: item.source,
                date: new Date(item.datetime * 1000).toLocaleDateString(),
                url: item.url,
                summary: item.summary
            }));

        return NextResponse.json({ news });

    } catch (error) {
        console.error(`News fetch failed associated with ${symbol}`, error);
        return NextResponse.json({ news: [] }); // Fail gracefully with empty list
    }
}
