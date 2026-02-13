// Test if ETFs are in stock API
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

async function testETFsInStockAPI() {
    const apiKey = process.env.KRX_API_KEY;

    // Use today's date
    const today = new Date();
    const basDd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const url = `https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd?basDd=${basDd}`;

    console.log(`\n🔍 Searching for ETFs in Stock API (${basDd})\n`);
    console.log('='.repeat(80));

    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'AUTH_KEY': apiKey },
    });

    if (!response.ok) {
        console.error(`API Error: ${response.status}`);
        return;
    }

    const data = await response.json();
    const allStocks = data.OutBlock_1 || [];

    console.log(`Total stocks: ${allStocks.length}\n`);

    // Search for our portfolio ETFs
    const portfolioETFs = ['458730', '489250', '447770', '448630', '0041D0', '284420', '447800'];

    console.log('Portfolio ETFs:\n');
    portfolioETFs.forEach(code => {
        const found = allStocks.find(s => s.ISU_CD === code || s.ISU_CD.includes(code));
        if (found) {
            console.log(`✅ ${code.padEnd(10)} | ${found.ISU_NM.padEnd(30)} | ${found.TDD_CLSPRC.padStart(10)} KRW`);
        } else {
            console.log(`❌ ${code.padEnd(10)} | NOT FOUND`);
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nSearching for Tiger/Kodex ETFs in stock API:\n');

    const etfKeywords = ['Tiger', 'TIGER', 'Kodex', 'KODEX', 'Sol', 'Ace'];
    etfKeywords.forEach(keyword => {
        const matches = allStocks.filter(s => s.ISU_NM.includes(keyword));
        if (matches.length > 0) {
            console.log(`\n"${keyword}" ETFs (${matches.length}개):`);
            matches.slice(0, 5).forEach(etf => {
                console.log(`  ${etf.ISU_CD.padEnd(10)} | ${etf.ISU_NM}`);
            });
        }
    });

    console.log('\n' + '='.repeat(80));
}

testETFsInStockAPI();
