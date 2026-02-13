// Test Finnhub quote API to see 52-week data
const finnhub = require('finnhub');

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY || '';
const finnhubClient = new finnhub.DefaultApi();

function getQuote(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (error, data, response) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

async function test() {
    try {
        console.log('Testing Finnhub quote API for XLK...\n');
        const quote = await getQuote('XLK');
        console.log('Full quote response:');
        console.log(JSON.stringify(quote, null, 2));

        console.log('\n--- Key fields ---');
        console.log('Current price (c):', quote.c);
        console.log('High (h):', quote.h);
        console.log('Low (l):', quote.l);
        console.log('Previous close (pc):', quote.pc);

        // Check for 52-week fields
        if (quote.hasOwnProperty('52WeekHigh') || quote.hasOwnProperty('weekHigh52')) {
            console.log('\n✅ Found 52-week data in quote!');
        } else {
            console.log('\n❌ 52-week data NOT in quote response');
            console.log('All fields:', Object.keys(quote));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

test();
