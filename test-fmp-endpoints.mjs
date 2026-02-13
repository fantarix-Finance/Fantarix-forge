// Test different FMP endpoints
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

const FMP_API_KEY = process.env.FMP_API_KEY;

console.log('\n='.repeat(80));
console.log('Testing Multiple FMP Endpoints');
console.log('='.repeat(80));

const endpoints = [
    {
        name: 'Quote API v3 (Standard)',
        url: (symbol) => `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`
    },
    {
        name: 'Quote Short API v3',
        url: (symbol) => `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=${FMP_API_KEY}`
    },
    {
        name: 'Index Quote (Direct SPX)',
        url: () => `https://financialmodelingprep.com/api/v3/quote/SPX?apikey=${FMP_API_KEY}`
    },
    {
        name: 'Real-time Price',
        url: (symbol) => `https://financialmodelingprep.com/api/v3/stock/real-time-price/${symbol}?apikey=${FMP_API_KEY}`
    }
];

async function testEnds() {
    for (const endpoint of endpoints) {
        console.log(`\n📋 Testing: ${endpoint.name}`);
        console.log('-'.repeat(80));

        try {
            const url = endpoint.url('^GSPC');
            console.log(`URL: ${url.substring(0, 100)}...`);

            const res = await fetch(url);
            console.log(`Status: ${res.status} ${res.statusText}`);

            const data = await res.json();

            if (res.ok) {
                console.log(`✅ Success!`);
                console.log(`Response:`, JSON.stringify(data, null, 2).substring(0, 500));
            } else {
                console.log(`❌ Error Response:`, JSON.stringify(data, null, 2));
            }

        } catch (err) {
            console.log(`❌ Exception: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 1500));
    }
}

testEnds();
