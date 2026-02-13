// Test ETF API with previous week's date
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testETFWithWorkingDay() {
    const apiKey = process.env.KRX_API_KEY;

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Testing ETF API with Previous Trading Days');
    console.log('='.repeat(80));

    // Test with known working dates (last week's weekdays)
    const testDates = [
        '20260206',  // Friday
        '20260205',  // Thursday  
        '20260204',  // Wednesday
        '20260203',  // Tuesday
        '20260202',  // Monday
    ];

    const url = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';

    for (const basDd of testDates) {
        console.log(`\n📅 Testing ${basDd}`);
        console.log('-'.repeat(80));

        try {
            const fullUrl = `${url}?basDd=${basDd}`;
            const response = await fetch(fullUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'AUTH_KEY': apiKey
                },
            });

            console.log(`   Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                const count = data.OutBlock_1?.length || 0;
                console.log(`   ✅ ETF Count: ${count}`);

                if (count > 0) {
                    console.log(`\n   Sample ETFs:`);
                    data.OutBlock_1.slice(0, 3).forEach((etf, i) => {
                        console.log(`      ${i + 1}. ${etf.ISU_CD} - ${etf.ISU_NM} - ${etf.TDD_CLSPRC} KRW`);
                    });

                    // Check portfolio ETFs
                    const portfolioETFs = ['458730', '489250', '447770', '448630', '284420', '447800'];
                    console.log(`\n   Portfolio ETFs:`);

                    portfolioETFs.forEach(code => {
                        const found = data.OutBlock_1.find(e => e.ISU_CD.includes(code));
                        if (found) {
                            console.log(`      ✅ ${code} - ${found.ISU_NM} - ${found.TDD_CLSPRC} KRW`);
                        }
                    });

                    console.log(`\n✅ SUCCESS! ETF API is working correctly!`);
                    return; // Found data, stop testing
                }
            } else {
                const text = await response.text();
                console.log(`   ❌ Error: ${text.substring(0, 100)}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n' + '='.repeat(80));
}

testETFWithWorkingDay();
