// Test the CORRECT ETF API endpoint
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testCorrectETFEndpoint() {
    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        console.error('❌ KRX_API_KEY not found!');
        return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Testing CORRECT ETF API Endpoint');
    console.log('='.repeat(80));

    // Test last 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const basDd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        dates.push({
            date: date.toLocaleDateString('ko-KR'),
            basDd,
            dayName: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
        });
    }

    // CORRECT endpoint: /etp/ instead of /sto/
    const correctUrl = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';

    for (const { date, basDd, dayName } of dates) {
        console.log(`\n📅 ${basDd} (${dayName}) - ${date}`);
        console.log('-'.repeat(80));

        const fullUrl = `${correctUrl}?basDd=${basDd}`;

        try {
            const response = await fetch(fullUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'AUTH_KEY': apiKey
                },
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                const etfCount = data.OutBlock_1?.length || 0;

                console.log(`   ✅ Response received`);
                console.log(`   📊 ETF Count: ${etfCount}`);

                if (etfCount > 0) {
                    console.log(`\n   First 5 ETFs:`);
                    data.OutBlock_1.slice(0, 5).forEach((etf, i) => {
                        console.log(`      ${i + 1}. ${etf.ISU_CD} - ${etf.ISU_NM} - ${etf.TDD_CLSPRC} KRW`);
                    });

                    // Check for portfolio ETFs
                    const portfolioETFs = ['458730', '489250', '447770', '448630', '0041D0', '284420', '447800'];
                    console.log(`\n   Portfolio ETFs in result:`);

                    portfolioETFs.forEach(code => {
                        const found = data.OutBlock_1.find(e => e.ISU_CD === code || e.ISU_CD.includes(code));
                        if (found) {
                            console.log(`      ✅ ${code} - ${found.ISU_NM} - ${found.TDD_CLSPRC} KRW`);
                        } else {
                            console.log(`      ❌ ${code} - NOT FOUND`);
                        }
                    });

                    console.log(`\n✅ SUCCESS! Found ${etfCount} ETFs for ${basDd}`);
                    break;
                } else {
                    console.log(`   ⚠️  No ETFs found for this date (likely weekend/holiday)`);
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ Error: ${errorText}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n' + '='.repeat(80));
}

testCorrectETFEndpoint();
