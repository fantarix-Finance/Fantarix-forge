import { NextResponse } from 'next/server';
import { getStockPrice } from '../../../lib/krx-api';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

/**
 * Get real-time price data for Korean stocks (KOSPI/KOSDAQ)
 * Uses KRX (Korea Exchange) official REST API
 * Supports: .KS (KOSPI), .KQ (KOSDAQ), .KN (KONEX)
 * 
 * Example: /api/korean-stock-price?symbol=005930.KS
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    console.log(`[korean-stock-price] Fetching price for symbol: ${symbol} via KRX API`);

    try {
        // Extract ticker from Yahoo Finance format (e.g., "005930.KS" -> "005930")
        const ticker = symbol.split('.')[0];

        // Call KRX API directly
        const result = await getStockPrice(ticker, symbol);

        console.log(`[korean-stock-price] KRX result:`, result);

        // Check if there was an error
        if (result.error) {
            return NextResponse.json({
                error: result.error,
                symbol,
                ticker: result.ticker,
                market: result.market
            }, { status: 404 });
        }

        // Return successful response
        const currentPrice = result.currentPrice ?? 0;
        const changePercent = result.changePercent ?? 0;

        return NextResponse.json({
            symbol: result.symbol,
            ticker: result.ticker,
            market: result.market,
            name: result.name,
            currentPrice: currentPrice,
            previousClose: calculatePreviousClose(currentPrice, changePercent),
            change: calculateChange(currentPrice, changePercent),
            changePercent: changePercent,
            dayHigh: result.high,
            dayLow: result.low,
            volume: result.volume,
            marketCap: result.marketCap,
            source: 'KRX',
            date: result.date
        });

    } catch (error: any) {
        console.error(`[korean-stock-price] Error for ${symbol}:`, error);

        return NextResponse.json({
            error: error.message || 'Failed to fetch price data',
            symbol,
            details: error.toString()
        }, { status: 500 });
    }
}

/**
 * Calculate previous close price from current price and change percent
 */
function calculatePreviousClose(currentPrice: number, changePercent: number): number {
    if (!currentPrice || !changePercent) return currentPrice;
    const previousClose = currentPrice / (1 + changePercent / 100);
    return isNaN(previousClose) ? currentPrice : previousClose;
}

/**
 * Calculate price change from current price and change percent
 */
function calculateChange(currentPrice: number, changePercent: number): number {
    if (!currentPrice || !changePercent) return 0;
    const previousClose = calculatePreviousClose(currentPrice, changePercent);
    const change = currentPrice - previousClose;
    return isNaN(change) ? 0 : change;
}
