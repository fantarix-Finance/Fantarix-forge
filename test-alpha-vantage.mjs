import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const testItems = [
    // Commodities
    { symbol: 'GC=F', name: 'Gold Futures', function: 'GLOBAL_QUOTE' },
    { symbol: 'CL=F', name: 'Oil Futures', function: 'GLOBAL_QUOTE' },

    // Treasury Yields
    { symbol: '^TNX', name: '10-Year Treasury Yield', function: 'TREASURY_YIELD', interval: 'daily', maturity: '10year' },
    { symbol: '^TYX', name: '30-Year Treasury Yield', function: 'TREASURY_YIELD', interval: 'daily', maturity: '30year' },
];

console.log('\n' + '='.repeat(80));
console.log('Testing Alpha Vantage API');
console.log('='.repeat(80));

async function testAlphaVantage() {
    for (const item of testItems) {
        try {
            console.log(`\n📊 Testing: ${item.name} (${item.symbol})`);

            let url;
            if (item.function === 'TREASURY_YIELD') {
                url = `https://www.alphavantage.co/query?function=${item.function}&interval=${item.interval}&maturity=${item.maturity}&apikey=${API_KEY}`;
            } else {
                url = `https://www.alphavantage.co/query?function=${item.function}&symbol=${item.symbol}&apikey=${API_KEY}`;
            }

            console.log(`   URL: ${url.replace(API_KEY, 'API_KEY')}`);

            const response = await fetch(url);
            const data = await response.json();

            console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));

            // Rate limit: Alpha Vantage free tier is 25 calls/day, 5 calls/min
            await new Promise(resolve => setTimeout(resolve, 13000)); // Wait 13 seconds between calls

        } catch (err) {
            console.log(`   ❌ ERROR: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test Complete!');
    console.log('='.repeat(80));
}

testAlphaVantage();
