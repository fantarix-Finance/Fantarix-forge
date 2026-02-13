// Test both stock and ETF APIs to compare
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testAPIs() {
    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        console.error('KRX_API_KEY not found!');
        return;
    }

    // Test last 5 days
    const dates = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const basDd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        dates.push({
            date: date.toLocaleDateString('ko-KR'),
            basDd,
            dayName: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
        });
    }

    console.log('\n='.repeat(80));
    console.log('Testing KRX APIs - Last 5 days');
    console.log('='.repeat(80));

    for (const { date, basDd, dayName } of dates) {
        console.log(`\n📅 ${basDd} (${dayName}) - ${date}`);
        console.log('-'.repeat(80));

        // Test KOSPI Stock API
        const stockUrl = `https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd?basDd=${basDd}`;
        try {
            const stockRes = await fetch(stockUrl, {
                headers: { 'Content-Type': 'application/json', 'AUTH_KEY': apiKey },
            });
            const stockCount = stockRes.ok ? (await stockRes.json()).OutBlock_1?.length || 0 : 0;
            console.log(`  주식 API (stk_bydd_trd):  ${stockRes.ok ? '✅' : '❌'} ${stockRes.status} - ${stockCount} stocks`);
        } catch (e) {
            console.log(`  주식 API (stk_bydd_trd):  ❌ ERROR - ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 300));

        // Test ETF API
        const etfUrl = `https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd?basDd=${basDd}`;
        try {
            const etfRes = await fetch(etfUrl, {
                headers: { 'Content-Type': 'application/json', 'AUTH_KEY': apiKey },
            });
            const etfCount = etfRes.ok ? (await etfRes.json()).OutBlock_1?.length || 0 : 0;
            console.log(`  ETF API (etf_bydd_trd):   ${etfRes.ok ? '✅' : '❌'} ${etfRes.status} - ${etfCount} ETFs`);
        } catch (e) {
            console.log(`  ETF API (etf_bydd_trd):   ❌ ERROR - ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n' + '='.repeat(80));
}

testAPIs();
