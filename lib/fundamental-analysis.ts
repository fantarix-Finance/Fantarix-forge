// Fundamental analysis utilities
// Calculate percentile rankings for fundamental metrics

export interface FundamentalMetrics {
    pe?: number;           // Price to Earnings
    pb?: number;           // Price to Book
    ps?: number;           // Price to Sales
    roe?: number;          // Return on Equity
    debtRatio?: number;    // Debt to Equity
    currentRatio?: number; // Current Ratio
    grossMargin?: number;  // Gross Margin %
    operatingMargin?: number; // Operating Margin %
    netMargin?: number;    // Net Margin %
    marketCap?: number;    // Market Cap
}

export interface FundamentalPercentiles {
    pe?: number;           // Lower is better (0% = cheapest)
    pb?: number;           // Lower is better
    ps?: number;           // Lower is better
    roe?: number;          // Higher is better (100% = best)
    debtRatio?: number;    // Lower is better
    currentRatio?: number; // Higher is better
    grossMargin?: number;  // Higher is better
    operatingMargin?: number; // Higher is better
    netMargin?: number;    // Higher is better
}

/**
 * Calculate percentile for a value in a dataset
 * @param value - The value to rank
 * @param dataset - Array of values to compare against
 * @param lowerIsBetter - If true, lower values get lower percentiles
 */
function calculatePercentile(
    value: number,
    dataset: number[],
    lowerIsBetter: boolean = false
): number {
    if (dataset.length === 0) return 50; // Default to median if no data

    const sorted = [...dataset].sort((a, b) => a - b);
    const rank = sorted.filter(v => lowerIsBetter ? v <= value : v >= value).length;

    return Math.round((rank / sorted.length) * 100);
}

/**
 * Calculate fundamental percentiles for a stock vs peer group
 */
export function calculateFundamentalPercentiles(
    metrics: FundamentalMetrics,
    peerMetrics: FundamentalMetrics[]
): FundamentalPercentiles {
    const percentiles: FundamentalPercentiles = {};

    // P/E: Lower is better (indicates cheaper valuation)
    if (metrics.pe !== undefined) {
        const peerPEs = peerMetrics.map(m => m.pe).filter((v): v is number => v !== undefined);
        percentiles.pe = calculatePercentile(metrics.pe, peerPEs, true);
    }

    // P/B: Lower is better
    if (metrics.pb !== undefined) {
        const peerPBs = peerMetrics.map(m => m.pb).filter((v): v is number => v !== undefined);
        percentiles.pb = calculatePercentile(metrics.pb, peerPBs, true);
    }

    // P/S: Lower is better
    if (metrics.ps !== undefined) {
        const peerPSs = peerMetrics.map(m => m.ps).filter((v): v is number => v !== undefined);
        percentiles.ps = calculatePercentile(metrics.ps, peerPSs, true);
    }

    // ROE: Higher is better (indicates better profitability)
    if (metrics.roe !== undefined) {
        const peerROEs = peerMetrics.map(m => m.roe).filter((v): v is number => v !== undefined);
        percentiles.roe = calculatePercentile(metrics.roe, peerROEs, false);
    }

    // Debt Ratio: Lower is better (indicates less leverage)
    if (metrics.debtRatio !== undefined) {
        const peerDebt = peerMetrics.map(m => m.debtRatio).filter((v): v is number => v !== undefined);
        percentiles.debtRatio = calculatePercentile(metrics.debtRatio, peerDebt, true);
    }

    // Current Ratio: Higher is better (indicates better liquidity)
    if (metrics.currentRatio !== undefined) {
        const peerCurrent = peerMetrics.map(m => m.currentRatio).filter((v): v is number => v !== undefined);
        percentiles.currentRatio = calculatePercentile(metrics.currentRatio, peerCurrent, false);
    }

    // Margins: Higher is better
    if (metrics.grossMargin !== undefined) {
        const peerGross = peerMetrics.map(m => m.grossMargin).filter((v): v is number => v !== undefined);
        percentiles.grossMargin = calculatePercentile(metrics.grossMargin, peerGross, false);
    }

    if (metrics.operatingMargin !== undefined) {
        const peerOp = peerMetrics.map(m => m.operatingMargin).filter((v): v is number => v !== undefined);
        percentiles.operatingMargin = calculatePercentile(metrics.operatingMargin, peerOp, false);
    }

    if (metrics.netMargin !== undefined) {
        const peerNet = peerMetrics.map(m => m.netMargin).filter((v): v is number => v !== undefined);
        percentiles.netMargin = calculatePercentile(metrics.netMargin, peerNet, false);
    }

    return percentiles;
}

/**
 * Get interpretation of percentile
 */
export function getPercentileInterpretation(
    percentile: number,
    metricName: string,
    lowerIsBetter: boolean = false
): string {
    if (lowerIsBetter) {
        if (percentile <= 20) return `${metricName} 매우 낮음 (상위 20%)`;
        if (percentile <= 40) return `${metricName} 낮음 (상위 40%)`;
        if (percentile <= 60) return `${metricName} 중간`;
        if (percentile <= 80) return `${metricName} 높음`;
        return `${metricName} 매우 높음 (하위 20%)`;
    } else {
        if (percentile >= 80) return `${metricName} 매우 우수 (상위 20%)`;
        if (percentile >= 60) return `${metricName} 우수 (상위 40%)`;
        if (percentile >= 40) return `${metricName} 중간`;
        if (percentile >= 20) return `${metricName} 부진`;
        return `${metricName} 매우 부진 (하위 20%)`;
    }
}

/**
 * Calculate 52-week price position
 */
export function calculate52WeekPosition(
    currentPrice: number,
    high52Week: number,
    low52Week: number
): {
    position: number;      // 0-100 scale
    fromHigh: number;      // % from 52-week high
    fromLow: number;       // % from 52-week low
    interpretation: string;
} {
    const range = high52Week - low52Week;
    const position = range > 0 ? ((currentPrice - low52Week) / range) * 100 : 50;

    const fromHigh = ((currentPrice - high52Week) / high52Week) * 100;
    const fromLow = ((currentPrice - low52Week) / low52Week) * 100;

    let interpretation = '';
    if (position >= 80) {
        interpretation = '52주 최고가 근처 (매수 주의)';
    } else if (position >= 60) {
        interpretation = '52주 중상위권';
    } else if (position >= 40) {
        interpretation = '52주 중간권';
    } else if (position >= 20) {
        interpretation = '52주 중하위권 (관심 영역)';
    } else {
        interpretation = '52주 최저가 근처 (저평가 기회?!)';
    }

    return {
        position: Math.round(position),
        fromHigh: Math.round(fromHigh * 100) / 100,
        fromLow: Math.round(fromLow * 100) / 100,
        interpretation
    };
}

/**
 * Detect significant price drop (10% or more)
 */
export function detectPriceDrop(
    prices: { date: string; close: number }[],
    threshold: number = 10
): {
    detected: boolean;
    dropPercent?: number;
    period?: string;
} {
    if (prices.length < 2) {
        return { detected: false };
    }

    // Sort by date (newest first)
    const sorted = [...prices].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const current = sorted[0].close;
    const recentHigh = Math.max(...sorted.slice(0, 5).map(p => p.close));

    const dropPercent = ((current - recentHigh) / recentHigh) * 100;

    if (Math.abs(dropPercent) >= threshold) {
        return {
            detected: true,
            dropPercent: Math.round(dropPercent * 100) / 100,
            period: '최근 5일'
        };
    }

    return { detected: false };
}
