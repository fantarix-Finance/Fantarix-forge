// Direct ETF API endpoint test
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testETFAPIEndpoint() {
    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        console.error('❌ KRX_API_KEY not found!');
        return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Testing ETF API Endpoint');
    console.log('='.repeat(80));

    // Test with multiple date variations
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

    // Test the ETF endpoint
    const etfUrl = 'https://data-dbg.krx.co.kr/svc/apis/sto/etf_bydd_trd';

    for (const { date, basDd, dayName } of dates) {
        console.log(`\n📅 Testing ${basDd} (${dayName}) - ${date}`);
        console.log('-'.repeat(80));

        const fullUrl = `${etfUrl}?basDd=${basDd}`;

        try {
            console.log(`📡 Requesting: ${fullUrl}`);

            const response = await fetch(fullUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'AUTH_KEY': apiKey
                },
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);
            console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const data = await response.json();
                const etfCount = data.OutBlock_1?.length || 0;

                console.log(`   ✅ Response received`);
                console.log(`   📊 ETF Count: ${etfCount}`);

                if (etfCount > 0) {
                    console.log(`\n   First 3 ETFs:`);
                    data.OutBlock_1.slice(0, 3).forEach((etf, i) => {
                        console.log(`      ${i + 1}. ${etf.ISU_CD} - ${etf.ISU_NM} - ${etf.TDD_CLSPRC} KRW`);
                    });

                    // Found data, stop searching
                    console.log(`\n✅ Successfully found ${etfCount} ETFs for ${basDd}`);
                    break;
                } else {
                    console.log(`   ⚠️  No ETFs found for this date`);
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ Error: ${errorText}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }

        // Wait between requests
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n' + '='.repeat(80));
}

testETFAPIEndpoint();
