// Simple test to check what codes KRX ETF API returns
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });

async function testETFAPI() {
    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        console.error('KRX_API_KEY not found!');
        return;
    }

    const today = new Date();
    const basDd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const url = `https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd?basDd=${basDd}`;

    console.log(`\nTesting ETF API for date: ${basDd}`);
    console.log(`URL: ${url}\n`);

    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'AUTH_KEY': apiKey,
            },
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log(`Total ETFs: ${data.OutBlock_1?.length || 0}\n`);

        if (data.OutBlock_1 && data.OutBlock_1.length > 0) {
            console.log('Sample ETFs (first 30):');
            console.log('='.repeat(80));

            const etfs = data.OutBlock_1.slice(0, 30);
            etfs.forEach((etf, index) => {
                console.log(`${String(index + 1).padStart(3)}. ${etf.ISU_CD.padEnd(10)} | ${etf.ISU_NM.padEnd(30)} | ${etf.TDD_CLSPRC.padStart(10)} KRW`);
            });

            console.log('\n' + '='.repeat(80));
            console.log('\nSearching for relevant ETFs:');
            console.log('='.repeat(80));

            const keywords = ['Tiger', 'Kodex', 'Sol', 'Ace', '미국', '다우'];
            keywords.forEach(keyword => {
                const matches = data.OutBlock_1.filter(etf => etf.ISU_NM.includes(keyword));
                if (matches.length > 0) {
                    console.log(`\n"${keyword}" 관련 ETF (${matches.length}개):`);
                    matches.slice(0, 10).forEach(etf => {
                        console.log(`  ${etf.ISU_CD.padEnd(10)} | ${etf.ISU_NM}`);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testETFAPI();
