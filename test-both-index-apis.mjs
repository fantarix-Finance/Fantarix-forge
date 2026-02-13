// Test both Twelve Data and FMP APIs for real index data
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

const indices = [
    { twelveSymbol: 'SPX', fmpSymbol: '^GSPC', name: 'S&P 500' },
    { twelveSymbol: 'DJI', fmpSymbol: '^DJI', name: 'Dow Jones' },
    { twelveSymbol: 'IXIC', fmpSymbol: '^IXIC', name: 'Nasdaq Composite' },
    { twelveSymbol: 'NDX', fmpSymbol: '^NDX', name: 'Nasdaq 100' },
    { twelveSymbol: 'VIX', fmpSymbol: '^VIX', name: 'VIX' }
];

console.log('\n' + '='.repeat(80));
console.log('Comparing Twelve Data vs Financial Modeling Prep');
console.log('='.repeat(80));
console.log(`Twelve Data API Key: ${TWELVE_DATA_API_KEY ? 'Found ✅' : 'Not Found ❌'}`);
console.log(`FMP API Key: ${FMP_API_KEY ? 'Found ✅' : 'Not Found ❌'}`);
console.log('='.repeat(80));

async function testBothAPIs() {
    for (const { twelveSymbol, fmpSymbol, name } of indices) {
        console.log(`\n📊 ${name}`);
        console.log('-'.repeat(80));

        // Test Twelve Data
        try {
            const twelveUrl = `https://api.twelvedata.com/quote?symbol=${twelveSymbol}&apikey=${TWELVE_DATA_API_KEY}`;
            const twelveRes = await fetch(twelveUrl);
            const twelveData = await twelveRes.json();

            if (twelveData.price) {
                console.log(`✅ Twelve Data (${twelveSymbol}):`);
                console.log(`   Price: ${twelveData.price}`);
                console.log(`   Change: ${twelveData.change} (${twelveData.percent_change}%)`);
                console.log(`   Timestamp: ${twelveData.datetime}`);
            } else if (twelveData.status === 'error') {
                console.log(`❌ Twelve Data Error: ${twelveData.message} (${twelveData.code})`);
            } else {
                console.log(`❓ Twelve Data Unknown:`, JSON.stringify(twelveData, null, 2));
            }
        } catch (err) {
            console.log(`❌ Twelve Data Error: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 1000));

        // Test FMP
        try {
            const fmpUrl = `https://financialmodelingprep.com/api/v3/quote/${fmpSymbol}?apikey=${FMP_API_KEY}`;
            const fmpRes = await fetch(fmpUrl);
            const fmpData = await fmpRes.json();

            if (Array.isArray(fmpData) && fmpData.length > 0) {
                const quote = fmpData[0];
                console.log(`✅ FMP (${fmpSymbol}):`);
                console.log(`   Price: ${quote.price}`);
                console.log(`   Change: ${quote.change} (${quote.changesPercentage}%)`);
                console.log(`   Timestamp: ${quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : 'N/A'}`);
            } else if (fmpData.error || fmpData['Error Message']) {
                console.log(`❌ FMP Error: ${fmpData.error || fmpData['Error Message']}`);
            } else {
                console.log(`❓ FMP Unknown:`, JSON.stringify(fmpData, null, 2));
            }
        } catch (err) {
            console.log(`❌ FMP Error: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n' + '='.repeat(80));
    console.log('Test Complete!');
    console.log('='.repeat(80));
}

testBothAPIs();
