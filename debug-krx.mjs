// Debug KRX API with specific date
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testWithDate(basDd) {
    const url = 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd';
    const requestUrl = `${url}?basDd=${basDd}`;

    console.log(`\n=== Testing with date: ${basDd} ===`);
    console.log('URL:', requestUrl);

    const response = await fetch(requestUrl, {
        headers: {
            'Content-Type': 'application/json',
            'AUTH_KEY': process.env.KRX_API_KEY,
        },
    });

    console.log('Status:', response.status);

    const data = await response.json();
    const count = data.OutBlock_1?.length || 0;

    console.log(`Received ${count} stocks`);

    if (count > 0) {
        console.log('\n=== First 3 stocks ===');
        data.OutBlock_1.slice(0, 3).forEach(stock => {
            console.log(`${stock.ISU_CD} - ${stock.ISU_NM}: ${stock.TDD_CLSPRC}`);
        });

        console.log('\n=== Looking for Samsung (005930) ===');
        const samsung = data.OutBlock_1.find(s => s.ISU_CD === '005930');
        if (samsung) {
            console.log('✅ Found Samsung!');
            console.log(JSON.stringify(samsung, null, 2));
        }
    }

    return count;
}

async function main() {
    // Test different dates
    const dates = [
        '20260209', // Today (Sunday)
        '20260207', // Friday
        '20260206', // Thursday
        '20260205', // Wednesday
    ];

    for (const date of dates) {
        const count = await testWithDate(date);
        if (count > 0) {
            console.log(`\n✅ Found data on ${date}!`);
            break;
        }
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
