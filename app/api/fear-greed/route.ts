import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FearGreedData {
    score: number;
    rating: string;
    timestamp: string;
    previous_close: number;
    previous_1_month: number;
    previous_1_year: number;
}

export async function GET() {
    try {
        console.log('[Fear & Greed] Fetching index data from CNN...');

        const res = await fetch(
            'https://production.dataviz.cnn.io/index/fearandgreed/graphdata/',
            {
                next: { revalidate: 3600 }, // 1시간 캐시
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (!res.ok) {
            throw new Error(`CNN API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        // Log the full response to debug
        console.log('[Fear & Greed] Full API response:', JSON.stringify(data.fear_and_greed, null, 2));

        const fearGreed: FearGreedData = data.fear_and_greed;

        // CNN API provides: previous_close, previous_1_week, previous_1_month, previous_1_year
        // But the field names might be different, let's check
        const oneWeekAgo = data.fear_and_greed.previous_1_week ||
            data.fear_and_greed_historical?.data?.[6] || // Try to get 7 days ago from historical
            fearGreed.previous_close; // Fallback to previous_close

        console.log(`[Fear & Greed] Score: ${fearGreed.score}, Rating: ${fearGreed.rating}`);
        console.log(`[Fear & Greed] 1 week ago value: ${oneWeekAgo}`);

        return NextResponse.json({
            success: true,
            data: {
                score: fearGreed.score,
                rating: fearGreed.rating,
                timestamp: fearGreed.timestamp,
                previousClose: fearGreed.previous_close,
                previous1Week: oneWeekAgo,
                previous1Month: fearGreed.previous_1_month,
                previous1Year: fearGreed.previous_1_year
            },
            fetchedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Fear & Greed] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
