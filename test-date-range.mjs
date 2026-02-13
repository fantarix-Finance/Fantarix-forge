// Test KRX API with specific dates
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testDateRange() {
    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        console.error('KRX_API_KEY not found!');
        return;
    }

    // Test dates: last 14 days
    const dates = [];
    for (let i = 0; i < 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const basDd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        dates.push({ date: date.toLocaleDateString('ko-KR'), basDd, dayOfWeek: date.toLocaleDateString('ko-KR', { weekday: 'long' }) });
    }

    console.log('Testing ETF API for the last 14 days:\n');
    console.log('='.repeat(100));

    for (const { date, basDd, dayOfWeek } of dates) {
        const url = `https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd?basDd=${basDd}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'AUTH_KEY': apiKey,
                },
            });

            const status = response.ok ? '✅ OK' : '❌ ' + response.status;
            const data = response.ok ? await response.json() : null;
            const count = data?.OutBlock_1?.length || 0;

            console.log(`${basDd} (${dayOfWeek.padEnd(6)}) ${date.padEnd(15)} | ${status.padEnd(10)} | ETFs: ${count}`);

            // If we found data, show sample
            if (count > 0) {
                const sample = data.OutBlock_1.find(etf => etf.ISU_NM.includes('Tiger') || etf.ISU_NM.includes('Kodex'));
                if (sample) {
                    console.log(`    Sample: ${sample.ISU_CD} - ${sample.ISU_NM} - ${sample.TDD_CLSPRC} KRW`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.log(`${basDd} (${dayOfWeek.padEnd(6)}) ${date.padEnd(15)} | ERROR: ${error.message}`);
        }
    }

    console.log('='.repeat(100));
}

testDateRange();
