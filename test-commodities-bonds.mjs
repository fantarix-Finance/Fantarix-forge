import finnhub from 'finnhub';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Finnhub client
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY || '';
const finnhubClient = new finnhub.DefaultApi();

// Helper: Promise wrapper for Finnhub
function getQuote(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (error, data, response) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

const testSymbols = [
    // Commodities - Futures
    { symbol: 'GC=F', name: 'Gold Futures', expected: '~2000' },
    { symbol: 'CL=F', name: 'WTI Oil Futures', expected: '~70' },

    // Commodities - ETFs (current)
    { symbol: 'GLD', name: 'Gold ETF', expected: '~200' },
    { symbol: 'USO', name: 'Oil ETF', expected: '~70' },

    // Treasury Yields
    { symbol: '^TNX', name: '10-Year Treasury Yield', expected: '~4%' },
    { symbol: '^TYX', name: '30-Year Treasury Yield', expected: '~4.5%' },

    // Treasury ETFs (current)
    { symbol: 'IEF', name: '10-Year Treasury ETF', expected: '~95' },
    { symbol: 'TLT', name: '30-Year Treasury ETF', expected: '~85' },
];

console.log('\n' + '='.repeat(80));
console.log('Testing Finnhub Support for Commodities & Bond Yields');
console.log('='.repeat(80));

async function testAll() {
    for (const item of testSymbols) {
        try {
            console.log(`\n📊 Testing: ${item.name} (${item.symbol})`);
            console.log(`   Expected: ${item.expected}`);

            const quote = await getQuote(item.symbol);

            if (quote.c && quote.c > 0) {
                console.log(`   ✅ SUCCESS: Price = ${quote.c}`);
                console.log(`   Change: ${quote.d || 0} (${quote.dp || 0}%)`);
            } else {
                console.log(`   ❌ FAILED: No data returned (c=${quote.c})`);
            }

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 1100));

        } catch (err) {
            console.log(`   ❌ ERROR: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test Complete!');
    console.log('='.repeat(80));
}

testAll();
