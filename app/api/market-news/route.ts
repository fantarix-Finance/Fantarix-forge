import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FinnhubNews {
    id: number;
    headline: string;
    source: string;
    datetime: number;
    url: string;
    image?: string;
    summary?: string;
    category?: string;
    related?: string;
}

export async function GET() {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    if (!FINNHUB_API_KEY) {
        return NextResponse.json(
            { success: false, error: 'Finnhub API key not configured' },
            { status: 500 }
        );
    }

    try {
        console.log('[Market News] Fetching general market news...');

        // Finnhub general market news
        const res = await fetch(
            `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 1800 } } // 30분 캐시
        );

        if (!res.ok) {
            throw new Error(`Finnhub API error: ${res.status} ${res.statusText}`);
        }

        const data: FinnhubNews[] = await res.json();

        // Top 15 most recent news
        const news = data
            .slice(0, 15)
            .map((item) => ({
                id: item.id,
                headline: item.headline,
                source: item.source,
                datetime: item.datetime,
                url: item.url,
                image: item.image,
                summary: item.summary,
                category: item.category
            }));

        console.log(`[Market News] Successfully fetched ${news.length} news items`);

        return NextResponse.json({
            success: true,
            news,
            fetchedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Market News] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
