// Portfolio CSV parser utility
export interface HoldingData {
    id: string;        // 종목코드
    name: string;      // 종목명
    qty: number;       // 수량
    avgCost: number;   // 평균단가
}

export interface AccountData {
    name: string;           // 계좌명
    holdings: HoldingData[];
}

export interface ParseResult {
    success: boolean;
    data?: AccountData[];
    error?: string;
}

/**
 * Parse CSV content into portfolio data
 * Expected format: 계좌명,종목코드,종목명,수량,평균단가
 */
export function parsePortfolioCSV(csvContent: string): ParseResult {
    try {
        const lines = csvContent.trim().split('\n');

        // Skip header
        if (lines.length < 2) {
            return {
                success: false,
                error: 'CSV 파일이 비어있습니다.'
            };
        }

        const dataLines = lines.slice(1); // Skip header row
        const accountsMap = new Map<string, HoldingData[]>();

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;

            const columns = line.split(',');

            if (columns.length < 5) {
                return {
                    success: false,
                    error: `줄 ${i + 2}: 컬럼 수가 부족합니다. (최소 5개 필요)`
                };
            }

            const [accountName, id, name, qtyStr, avgCostStr] = columns;

            // Validate
            const qty = parseInt(qtyStr.trim());
            const avgCost = parseFloat(avgCostStr.trim());

            if (isNaN(qty) || isNaN(avgCost)) {
                return {
                    success: false,
                    error: `줄 ${i + 2}: 수량 또는 평균단가가 숫자가 아닙니다.`
                };
            }

            const holding: HoldingData = {
                id: id.trim(),
                name: name.trim(),
                qty,
                avgCost
            };

            // Group by account
            if (!accountsMap.has(accountName.trim())) {
                accountsMap.set(accountName.trim(), []);
            }
            accountsMap.get(accountName.trim())!.push(holding);
        }

        // Convert map to array
        const accounts: AccountData[] = Array.from(accountsMap.entries()).map(
            ([name, holdings]) => ({ name, holdings })
        );

        return {
            success: true,
            data: accounts
        };

    } catch (error: any) {
        return {
            success: false,
            error: `파싱 오류: ${error.message}`
        };
    }
}

/**
 * Save portfolio data to LocalStorage
 */
export function savePortfolioToStorage(accounts: AccountData[]): void {
    localStorage.setItem('portfolio_data', JSON.stringify(accounts));
    localStorage.setItem('portfolio_updated_at', new Date().toISOString());
}

/**
 * Load portfolio data from LocalStorage
 */
export function loadPortfolioFromStorage(): AccountData[] | null {
    const data = localStorage.getItem('portfolio_data');
    if (!data) return null;

    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * Get last update timestamp
 */
export function getLastUpdateTime(): Date | null {
    const timestamp = localStorage.getItem('portfolio_updated_at');
    if (!timestamp) return null;

    try {
        return new Date(timestamp);
    } catch {
        return null;
    }
}

/**
 * Clear portfolio data from storage
 */
export function clearPortfolioStorage(): void {
    localStorage.removeItem('portfolio_data');
    localStorage.removeItem('portfolio_updated_at');
}
