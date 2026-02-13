// Test ETF API with today's date (Korea timezone)
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testTodayETF() {
    const apiKey = process.env.KRX_API_KEY;

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Testing ETF API with Today (Korea Time)');
    console.log('='.repeat(80));

    // Get today in Korea timezone
    function formatKoreaDate(date) {
        const koreaDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
        const koreaDate = new Date(koreaDateStr);

        const year = koreaDate.getFullYear();
        const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
        const day = String(koreaDate.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    }

    const now = new Date();
    const koreanDayName = now.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' });

    console.log(`\n현재 시간: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log(`요일: ${koreanDayName}`);

    // Test last 5 trading days (excluding today if it's early in the day)
    const dates = [];
    for (let i = 1; i <= 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const basDd = formatKoreaDate(date);
        const dayName = date.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' });
        dates.push({ basDd, dayName, date: date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) });
    }

    const url = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';

    console.log('\n지난 5일 데이터 조회:');
    console.log('-'.repeat(80));

    for (const { basDd, dayName, date } of dates) {
        console.log(`\n📅 ${basDd} (${dayName}) - ${date}`);

        try {
            const fullUrl = `${url}?basDd=${basDd}`;
            const response = await fetch(fullUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'AUTH_KEY': apiKey
                },
            });

            if (response.ok) {
                const data = await response.json();
                const count = data.OutBlock_1?.length || 0;
                console.log(`   ✅ Status: ${response.status} | ETF Count: ${count}`);

                if (count > 0) {
                    // Check portfolio ETFs
                    const portfolioETFs = ['458730', '489250', '447770', '448630', '284420', '447800'];
                    console.log(`\n   포트폴리오 ETF 조회:`);

                    let foundCount = 0;
                    portfolioETFs.forEach(code => {
                        const found = data.OutBlock_1.find(e => e.ISU_CD.includes(code));
                        if (found) {
                            console.log(`      ✅ ${code} - ${found.ISU_NM} - ${found.TDD_CLSPRC} KRW`);
                            foundCount++;
                        }
                    });

                    console.log(`\n   📊 포트폴리오 ETF ${foundCount}/${portfolioETFs.length}개 발견`);

                    if (foundCount > 0) {
                        console.log(`\n✅ SUCCESS! ${basDd} 데이터로 포트폴리오 ETF 조회 가능`);
                        break;
                    }
                }
            } else {
                console.log(`   ❌ Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n' + '='.repeat(80));
}

testTodayETF();
