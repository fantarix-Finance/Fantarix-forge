// Sector classification and stock database
// Maps stocks/ETFs to their sectors for filtering

export type SectorCategory =
    | 'AI'
    | 'SOFTWARE'
    | 'SEMICONDUCTOR'
    | 'DATACENTER_ENERGY'
    | 'NUCLEAR'
    | 'AEROSPACE'
    | 'DEFENSE'
    | 'OTHER';

export interface StockInfo {
    ticker: string;
    name: string;
    sectors: SectorCategory[];
    description?: string;
}

/**
 * Korean ETF Database
 * Maps Korean ticker symbols to their sectors
 */
export const KOREAN_ETF_DATABASE: Record<string, StockInfo> = {
    // AI & Software
    '484330': {
        ticker: 'KODEX 미국S&P소프트웨어TOP10',
        name: 'KODEX 미국S&P소프트웨어TOP10',
        sectors: ['AI', 'SOFTWARE'],
        description: 'AI 소프트웨어 성장 선도 기업 10개에 집중 투자합니다.'
    },
    '481180': {
        ticker: 'SOL 미국S&P소프트웨어',
        name: 'SOL 미국S&P소프트웨어',
        sectors: ['AI', 'SOFTWARE'],
        description: '미국 AI 소프트웨어 섹터 전반에 투자합니다.'
    },

    // Semiconductor
    '484330': {
        ticker: 'KODEX 미국S&P소프트웨어TOP10',
        name: 'KODEX 미국S&P소프트웨어TOP10',
        sectors: ['SEMICONDUCTOR'],
        description: '반도체 제조 및 장비 기업'
    },

    // Nuclear & Energy
    '433250': {
        ticker: 'TIGER 원자력 & 첨단방산',
        name: 'TIGER 원자력 & 첨단방산',
        sectors: ['NUCLEAR', 'DATACENTER_ENERGY', 'DEFENSE'],
        description: '원자력 및 방산 산업'
    },

    // Aerospace
    '371460': {
        ticker: 'TIGER 글로벌 우주항공&공공산업',
        name: 'TIGER 글로벌 우주항공&공공산업',
        sectors: ['AEROSPACE'],
        description: 'SpaceX 등 우주산업 관련'
    },

    // Defense
    '433250': {
        ticker: 'TIGER 원자력 & 첨단방산',
        name: 'TIGER 원자력 & 첨단방산',
        sectors: ['DEFENSE', 'NUCLEAR'],
        description: '방산 및 원자력 산업'
    }
};

/**
 * US Stock Database (key companies)
 */
export const US_STOCK_DATABASE: Record<string, StockInfo> = {
    // AI & Software Giants
    'MSFT': {
        ticker: 'MSFT',
        name: 'Microsoft',
        sectors: ['AI', 'SOFTWARE'],
        description: 'AI, 클라우드, 소프트웨어 리더'
    },
    'GOOGL': {
        ticker: 'GOOGL',
        name: 'Alphabet (Google)',
        sectors: ['AI', 'SOFTWARE'],
        description: 'AI 및 클라우드 서비스'
    },
    'META': {
        ticker: 'META',
        name: 'Meta Platforms',
        sectors: ['AI', 'SOFTWARE'],
        description: 'AI 및 메타버스'
    },
    'CRM': {
        ticker: 'CRM',
        name: 'Salesforce',
        sectors: ['AI', 'SOFTWARE'],
        description: 'SaaS 및 AI 플랫폼'
    },

    // Semiconductor
    'NVDA': {
        ticker: 'NVDA',
        name: 'NVIDIA',
        sectors: ['SEMICONDUCTOR', 'AI'],
        description: 'AI 칩 리더'
    },
    'AMD': {
        ticker: 'AMD',
        name: 'AMD',
        sectors: ['SEMICONDUCTOR', 'AI'],
        description: '반도체 및 AI 프로세서'
    },
    'TSM': {
        ticker: 'TSM',
        name: 'TSMC',
        sectors: ['SEMICONDUCTOR'],
        description: '반도체 파운드리'
    },
    'ASML': {
        ticker: 'ASML',
        name: 'ASML',
        sectors: ['SEMICONDUCTOR'],
        description: '반도체 장비'
    },

    // Nuclear & Energy
    'NEE': {
        ticker: 'NEE',
        name: 'NextEra Energy',
        sectors: ['NUCLEAR', 'DATACENTER_ENERGY'],
        description: '원자력 및 신재생 에너지'
    },
    'DUK': {
        ticker: 'DUK',
        name: 'Duke Energy',
        sectors: ['NUCLEAR', 'DATACENTER_ENERGY'],
        description: '원자력 에너지'
    },
    'SMR': {
        ticker: 'SMR',
        name: 'NuScale Power',
        sectors: ['NUCLEAR', 'DATACENTER_ENERGY'],
        description: '소형 모듈 원자로'
    },

    // Aerospace
    'LMT': {
        ticker: 'LMT',
        name: 'Lockheed Martin',
        sectors: ['AEROSPACE', 'DEFENSE'],
        description: '우주항공 및 방산'
    },
    'BA': {
        ticker: 'BA',
        name: 'Boeing',
        sectors: ['AEROSPACE', 'DEFENSE'],
        description: '항공우주 산업'
    },
    'RTX': {
        ticker: 'RTX',
        name: 'Raytheon Technologies',
        sectors: ['AEROSPACE', 'DEFENSE'],
        description: '우주항공 및 방산'
    },

    // Defense
    'NOC': {
        ticker: 'NOC',
        name: 'Northrop Grumman',
        sectors: ['DEFENSE', 'AEROSPACE'],
        description: '방산 및 우주'
    },
    'GD': {
        ticker: 'GD',
        name: 'General Dynamics',
        sectors: ['DEFENSE'],
        description: '방산 기업'
    }
};

/**
 * Get sectors for a ticker
 */
export function getSectorsForTicker(ticker: string): SectorCategory[] {
    const koreanStock = KOREAN_ETF_DATABASE[ticker.replace('.KS', '').replace('.KQ', '')];
    if (koreanStock) return koreanStock.sectors;

    const usStock = US_STOCK_DATABASE[ticker];
    if (usStock) return usStock.sectors;

    return ['OTHER'];
}

/**
 * Get all tickers for a sector
 */
export function getTickersForSector(sector: SectorCategory): string[] {
    const allStocks = { ...KOREAN_ETF_DATABASE, ...US_STOCK_DATABASE };

    return Object.values(allStocks)
        .filter(stock => stock.sectors.includes(sector))
        .map(stock => stock.ticker);
}

/**
 * Check if ticker matches user's interest sectors
 */
export function matchesUserInterests(ticker: string): boolean {
    const userInterests: SectorCategory[] = ['AI', 'DATACENTER_ENERGY', 'NUCLEAR', 'AEROSPACE', 'DEFENSE'];
    const sectors = getSectorsForTicker(ticker);

    return sectors.some(sector => userInterests.includes(sector));
}

/**
 * Get sector display name in Korean
 */
export function getSectorDisplayName(sector: SectorCategory): string {
    const names: Record<SectorCategory, string> = {
        AI: 'AI',
        SOFTWARE: '소프트웨어',
        SEMICONDUCTOR: '반도체',
        DATACENTER_ENERGY: '데이터센터 에너지',
        NUCLEAR: '원자력',
        AEROSPACE: '우주항공',
        DEFENSE: '방산',
        OTHER: '기타'
    };

    return names[sector];
}

// ============================================
// GICS SECTORS (11개 주요 섹터)
// ============================================

export interface GICSSectorInfo {
    sectorEn: string;
    sectorKo: string;
    etf: string;  // Sector ETF for 52-week position calculation
    stocks: string[];  // Representative stocks (top by market cap)
}

/**
 * 11 GICS Sectors with ETFs and Representative Stocks
 * ETF is used to calculate sector's 52-week position
 * Stocks are top 7 by market cap for display (we'll show top 3)
 */
export const GICS_SECTORS: Record<string, GICSSectorInfo> = {
    'Information Technology': {
        sectorEn: 'Information Technology',
        sectorKo: '정보기술',
        etf: 'XLK',
        stocks: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'ADBE']
    },
    'Health Care': {
        sectorEn: 'Health Care',
        sectorKo: '헬스케어',
        etf: 'XLV',
        stocks: ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT']
    },
    'Financials': {
        sectorEn: 'Financials',
        sectorKo: '금융',
        etf: 'XLF',
        stocks: ['JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS']
    },
    'Consumer Discretionary': {
        sectorEn: 'Consumer Discretionary',
        sectorKo: '임의소비재',
        etf: 'XLY',
        stocks: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT']
    },
    'Communication Services': {
        sectorEn: 'Communication Services',
        sectorKo: '통신서비스',
        etf: 'XLC',
        stocks: ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ']
    },
    'Consumer Staples': {
        sectorEn: 'Consumer Staples',
        sectorKo: '필수소비재',
        etf: 'XLP',
        stocks: ['PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO']
    },
    'Industrials': {
        sectorEn: 'Industrials',
        sectorKo: '산업재',
        etf: 'XLI',
        stocks: ['CAT', 'BA', 'HON', 'UNP', 'RTX', 'GE', 'LMT']
    },
    'Energy': {
        sectorEn: 'Energy',
        sectorKo: '에너지',
        etf: 'XLE',
        stocks: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX']
    },
    'Real Estate': {
        sectorEn: 'Real Estate',
        sectorKo: '부동산',
        etf: 'XLRE',
        stocks: ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG', 'O', 'WELL']
    },
    'Materials': {
        sectorEn: 'Materials',
        sectorKo: '소재',
        etf: 'XLB',
        stocks: ['LIN', 'SHW', 'APD', 'ECL', 'DD', 'NEM', 'FCX']
    },
    'Utilities': {
        sectorEn: 'Utilities',
        sectorKo: '유틸리티',
        etf: 'XLU',
        stocks: ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE']
    }
};

/**
 * Get all GICS sector keys
 */
export function getAllGICSSectors(): string[] {
    return Object.keys(GICS_SECTORS);
}

/**
 * Get GICS sector info by key
 */
export function getGICSSectorInfo(sectorKey: string): GICSSectorInfo | undefined {
    return GICS_SECTORS[sectorKey];
}

