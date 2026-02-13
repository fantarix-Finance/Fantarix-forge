import { NextResponse } from 'next/server';
import { getAllTreasuryYields } from '@/lib/alpha-vantage';
import { getFinnhubQuote } from '@/lib/finnhub-api';

// Force dynamic rendering to handle external API rate limits and timeouts
export const dynamic = 'force-dynamic';

// Symbol mapping: Yahoo Finance symbols → Finnhub symbols (ETFs)
const SYMBOL_MAP: Record<string, string> = {
    '^GSPC': 'SPY',      // S&P 500 ETF
    '^IXIC': 'QQQ',      // Nasdaq ETF
    '^DJI': 'DIA',       // Dow Jones ETF
    '^VIX': 'VXX',       // VIX ETF
    '^TNX': 'IEF',       // 10Y Bond ETF
    '^TYX': 'TLT',       // 30Y Bond ETF
    'GC=F': 'GLD',       // Gold ETF
    'CL=F': 'USO',       // Oil ETF
    'BTC-USD': 'BITO',   // Bitcoin ETF
    'DX-Y.NYB': 'UUP',   // Dollar ETF
    // Sectors use same symbols
};

// ETF-to-Index conversion multipliers
// These convert ETF prices to approximate index values
const INDEX_MULTIPLIERS: Record<string, number> = {
    '^GSPC': 10,    // SPY × 10 ≈ S&P 500 Index
    '^DJI': 100,    // DIA × 100 ≈ Dow Jones Index
    '^IXIC': 40,    // QQQ × 40 ≈ Nasdaq Composite (approximate)
    // Others use ETF price as-is
};

export async function GET(request: Request) {

    const definitions = [
        // Indices (converted from ETF prices to index values)
        { symbol: '^GSPC', name: 'S&P 500', category: 'index', isIndex: true },
        { symbol: '^IXIC', name: '나스닥', category: 'index', isIndex: true },
        { symbol: '^DJI', name: '다우 존스', category: 'index', isIndex: true },
        { symbol: '^VIX', name: 'VIX', category: 'index' },

        // Treasury Yields (fetched from Alpha Vantage)
        { symbol: '^TNX', name: '미국채 10년', category: 'index', isTreasuryYield: true, maturity: '10year' },
        { symbol: '^TYX', name: '미국채 30년', category: 'index', isTreasuryYield: true, maturity: '30year' },

        // Macros
        { symbol: 'GC=F', name: '금 ETF (GLD)', category: 'macro' },
        { symbol: 'CL=F', name: '원유 ETF (USO)', category: 'macro' },
        { symbol: 'BTC-USD', name: '비트코인', category: 'macro' },
        { symbol: 'DX-Y.NYB', name: '달러인덱스', category: 'macro' },

        // Sectors (use existing symbols)
        { symbol: 'XLK', name: '테크', category: 'sector' },
        { symbol: 'XLF', name: '금융', category: 'sector' },
        { symbol: 'XLV', name: '헬스케어', category: 'sector' },
        { symbol: 'XLE', name: '에너지', category: 'sector' },
        { symbol: 'XLY', name: '임의소비재', category: 'sector' },
        { symbol: 'XLP', name: '필수소비재', category: 'sector' },
        { symbol: 'XLC', name: '커뮤니케이션', category: 'sector' },
        { symbol: 'XLI', name: '산업재', category: 'sector' },
        { symbol: 'XLU', name: '유틸리티', category: 'sector' },
        { symbol: 'XLB', name: '소재', category: 'sector' },
        { symbol: 'XLRE', name: '부동산', category: 'sector' }
    ];

    try {
        const results = [];

        // Fetch treasury yields from Alpha Vantage (in parallel)
        const treasuryYields = await getAllTreasuryYields();

        for (const item of definitions) {
            try {
                // Handle Treasury Yields separately (from Alpha Vantage)
                if (item.isTreasuryYield) {
                    const maturityKey = (item as any).maturity as '10year' | '30year';
                    const changeKey = maturityKey === '10year' ? '10yearChange' : '30yearChange';
                    const dateKey = maturityKey === '10year' ? '10yearDate' : '30yearDate';

                    const yieldValue = treasuryYields ? treasuryYields[maturityKey] : null;
                    const changeValue = treasuryYields ? treasuryYields[changeKey] : 0;
                    const dateValue = treasuryYields ? treasuryYields[dateKey] : null;

                    console.log(`[Treasury] ${item.name}: maturity=${maturityKey}, value=${yieldValue}, change=${changeValue}, date=${dateValue}`);

                    if (yieldValue !== null && yieldValue !== undefined) {
                        results.push({
                            name: item.name,
                            symbol: item.symbol,
                            category: item.category,
                            price: yieldValue,  // Yield as percentage (e.g., 4.21)
                            change: changeValue, // Daily change (e.g. +0.05)
                            isPositive: true,
                            // Use actual data date if available, otherwise current time
                            timestamp: dateValue ? new Date(dateValue).toISOString() : new Date().toISOString(),
                            marketState: 'CLOSED', // It's daily data, so effectively closed/EOD
                            isTreasuryYield: true,
                        });
                    } else {
                        console.error(`[Treasury] ${item.name} FAILED: value=${yieldValue}`);
                        results.push({
                            name: item.name,
                            symbol: item.symbol,
                            category: item.category,
                            price: 0,
                            change: 0,
                            isPositive: true,
                            error: true,
                            errorMessage: 'Failed to fetch treasury yield',
                            timestamp: new Date().toISOString(),
                            marketState: 'UNKNOWN',
                        });
                    }
                    continue;
                }

                // Handle regular Finnhub data (indices, commodities, sectors)
                const finnhubSymbol = SYMBOL_MAP[item.symbol] || item.symbol;
                const quote = await getFinnhubQuote(finnhubSymbol);

                if (!quote) {
                    throw new Error(`Failed to fetch quote for ${finnhubSymbol}`);
                }

                // Convert ETF price to index value if multiplier exists
                const multiplier = INDEX_MULTIPLIERS[item.symbol] || 1;
                const convertedPrice = (quote.currentPrice || 0) * multiplier;

                // Round to 2 decimal places for indices
                const displayPrice = Math.round(convertedPrice * 100) / 100;

                results.push({
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    price: displayPrice,
                    change: quote.changePercent || 0,
                    isPositive: (quote.changePercent || 0) >= 0,
                    // Use timestamp from quote or current time
                    timestamp: quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : new Date().toISOString(),
                    marketState: 'REGULAR',
                    // Add metadata for UI to show "ETF 기반" label
                    isEstimated: multiplier > 1,
                    etfSymbol: multiplier > 1 ? finnhubSymbol : undefined
                });

                // Rate limit protection
                // Even with caching, good to have a small delay if cache misses accumulate
                await new Promise(resolve => setTimeout(resolve, 50));

            } catch (err: any) {
                console.error(`Failed to fetch ${item.symbol}:`, err.message);
                results.push({
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    price: 0,
                    change: 0,
                    isPositive: true,
                    error: true,
                    errorMessage: err?.message || 'Failed to fetch data',
                    timestamp: new Date().toISOString(),
                    marketState: 'UNKNOWN'
                });
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Finnhub Global Error:", error);
        return NextResponse.json({
            error: 'Failed to fetch market data',
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
