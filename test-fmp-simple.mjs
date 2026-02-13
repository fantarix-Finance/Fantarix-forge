// Simple FMP test with better error handling
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

const FMP_API_KEY = process.env.FMP_API_KEY;

console.log('\n' + '='.repeat(80));
console.log('Testing Financial Modeling Prep API');
console.log('='.repeat(80));
console.log(`API Key: ${FMP_API_KEY ? 'Found ✅' : 'Missing ❌'}\n`);

const indices = [
    { symbol: '^GSPC', name: 'S&P 500', expectedRange: [6000, 7500] },
    { symbol: '^DJI', name: 'Dow Jones', expectedRange: [45000, 55000] },
    { symbol: '^IXIC', name: 'Nasdaq Composite', expectedRange: [20000, 25000] },
    { symbol: '^VIX', name: 'VIX', expectedRange: [10, 40] }
];

async function testFMP() {
    for (const { symbol, name, expectedRange } of indices) {
        try {
            const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`;
            console.log(`\n📊 ${name} (${symbol})`);
            console.log(`   URL: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            console.log(`   Status: ${response.status}`);
            console.log(`   Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);

            if (Array.isArray(data) && data.length > 0) {
                const quote = data[0];
                const price = parseFloat(quote.price);
                const inRange = price >= expectedRange[0] && price <= expectedRange[1];

                console.log(`   ${inRange ? '✅' : '⚠️'} Price: ${price.toLocaleString()} ${inRange ? '' : `(Expected: ${expectedRange[0]}-${expectedRange[1]})`}`);
                console.log(`   Change: ${quote.change} (${quote.changesPercentage?.toFixed(2)}%)`);
                console.log(`   Volume: ${quote.volume?.toLocaleString()}`);
                console.log(`   Previous Close: ${quote.previousClose}`);
                console.log(`   Market Cap: ${quote.marketCap ? (quote.marketCap / 1e12).toFixed(2) + 'T' : 'N/A'}`);
            } else if (data['Error Message']) {
                console.log(`   ❌ Error: ${data['Error Message']}`);
            } else if (data.error) {
                console.log(`   ❌ Error: ${data.error}`);
            } else {
                console.log(`   ❓ Response:`, JSON.stringify(data, null, 2));
            }

            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            console.log(`   ❌ Exception: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

testFMP();
