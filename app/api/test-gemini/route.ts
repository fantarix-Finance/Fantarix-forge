import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                error: 'API key not found',
                message: 'GEMINI_API_KEY is not set in .env.local'
            }, { status: 400 });
        }

        // Use REST API directly to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { next: { revalidate: 0 } }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                error: 'Failed to fetch models',
                status: response.status,
                statusText: response.statusText,
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();

        // Filter models that support generateContent
        const generativeModels = data.models?.filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
        ) || [];

        return NextResponse.json({
            success: true,
            apiKey: apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4),
            totalModels: data.models?.length || 0,
            generativeModels: generativeModels.length,
            models: generativeModels.map((m: any) => ({
                name: m.name,
                displayName: m.displayName,
                description: m.description,
                supportedGenerationMethods: m.supportedGenerationMethods,
                inputTokenLimit: m.inputTokenLimit,
                outputTokenLimit: m.outputTokenLimit
            }))
        });

    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to list models',
            message: error.message,
            details: error.toString()
        }, { status: 500 });
    }
}
