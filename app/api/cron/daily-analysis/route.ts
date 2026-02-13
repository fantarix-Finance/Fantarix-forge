import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job - Daily Risk Analysis
 * Schedule: Every day at 8 AM (0 8 * * *)
 * 
 * This endpoint is called automatically by Vercel Cron to:
 * 1. Trigger risk analysis API to refresh data
 * 2. Trigger market scanner to find new opportunities
 * 3. Pre-warm cache for faster user experience
 */
export async function GET(request: Request) {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');

    // In production, Vercel adds Authorization header to cron requests
    // For local testing, we allow requests without auth
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (isProduction && !isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // 1. Trigger Risk Analysis
        const riskAnalysisPromise = fetch(`${baseUrl}/api/risk-analysis`, {
            next: { revalidate: 0 }
        });

        // 2. Trigger Market Scanner
        const marketScannerPromise = fetch(`${baseUrl}/api/agents/market-scanner`, {
            next: { revalidate: 0 }
        });

        // Wait for both to complete
        const [riskAnalysisRes, marketScannerRes] = await Promise.allSettled([
            riskAnalysisPromise,
            marketScannerPromise
        ]);

        // Collect results
        const results = {
            timestamp: new Date().toISOString(),
            riskAnalysis: {
                status: riskAnalysisRes.status === 'fulfilled' ? 'success' : 'failed',
                statusCode: riskAnalysisRes.status === 'fulfilled' ? riskAnalysisRes.value.status : undefined,
                error: riskAnalysisRes.status === 'rejected' ? riskAnalysisRes.reason?.message : undefined
            },
            marketScanner: {
                status: marketScannerRes.status === 'fulfilled' ? 'success' : 'failed',
                statusCode: marketScannerRes.status === 'fulfilled' ? marketScannerRes.value.status : undefined,
                error: marketScannerRes.status === 'rejected' ? marketScannerRes.reason?.message : undefined
            }
        };

        // Log results
        console.log('[Cron] Daily analysis completed:', results);

        return NextResponse.json({
            success: true,
            message: 'Daily analysis triggered successfully',
            results
        });

    } catch (error: any) {
        console.error('[Cron] Daily analysis failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
