// Test Finnhub API for real index data
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import finnhub from 'finnhub';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

// Initialize Finnhub
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY || '';
const finnhubClient = new finnhub.DefaultApi();

// Test real index symbols
const indices = [
    { symbol: '^GSPC', name: 'S&P 500 Index' },
    { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
    { symbol: '^IXIC', name: 'Nasdaq Composite' },
    { symbol: '^NDX', name: 'Nasdaq 100' },
    { symbol: '^RUT', name: 'Russell 2000' },
    { symbol: '^VIX', name: 'VIX' },
    // Also test current ETF symbols for comparison
    { symbol: 'SPY', name: 'S&P 500 ETF (for comparison)' },
    { symbol: 'QQQ', name: 'Nasdaq ETF (for comparison)' },
    { symbol: 'DIA', name: 'Dow ETF (for comparison)' }
];

function getQuote(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (error, data, response) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

async function testFinnhubIndices() {
    console.log('\n' + '='.repeat(80));
    console.log('Testing Finnhub API for Real Market Indices');
    console.log('='.repeat(80));
    console.log(`API Key: ${api_key.apiKey ? 'Found ✅' : 'Not Found ❌'}\n`);

    if (!api_key.apiKey) {
        console.log('❌ No API key found!');
        return;
    }

    for (const { symbol, name } of indices) {
        try {
            console.log(`\n📊 Testing: ${name} (${symbol})`);

            const quote = await getQuote(symbol);

            // Finnhub response: { c: current, d: change, dp: percent change, h: high, l: low, o: open, pc: previous close, t: timestamp }

            if (quote && quote.c && quote.c > 0) {
                console.log(`✅ Success!`);
                console.log(`   Current Price: ${quote.c}`);
                console.log(`   Change: ${quote.d} (${quote.dp?.toFixed(2)}%)`);
                console.log(`   Previous Close: ${quote.pc}`);
                console.log(`   Day Range: ${quote.l} - ${quote.h}`);
                console.log(`   Timestamp: ${quote.t ? new Date(quote.t * 1000).toISOString() : 'N/A'}`);
            } else {
                console.log(`❌ No valid data (price: ${quote?.c})`);
                console.log(`   Response:`, JSON.stringify(quote, null, 2));
            }

            // Rate limit: 60 calls/min, so wait 1 second
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Summary:');
    console.log('If index symbols (^GSPC, ^DJI, etc.) return valid data,');
    console.log('we can use them directly instead of ETF proxies!');
    console.log('='.repeat(80));
}

testFinnhubIndices();
