import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

async function testBothYields() {
    console.log('\n' + '='.repeat(80));
    console.log('Testing Alpha Vantage Treasury Yields');
    console.log('='.repeat(80));

    const yields = ['10year', '30year'];

    for (const maturity of yields) {
        try {
            console.log(`\n📊 Testing: ${maturity} Treasury Yield`);

            const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${API_KEY}`;
            console.log(`   URL: ${url.replace(API_KEY, 'API_KEY')}`);

            const response = await fetch(url);
            console.log(`   Status: ${response.status} ${response.statusText}`);

            const text = await response.text();
            console.log(`   Response length: ${text.length} bytes`);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.log(`   ❌ JSON Parse Error: ${e.message}`);
                console.log(`   Raw response: ${text.substring(0, 500)}`);
                continue;
            }

            console.log(`   Response keys:`, Object.keys(data));

            if (data.data && data.data.length > 0) {
                console.log(`   ✅ SUCCESS: Latest yield = ${data.data[0].value}%`);
                console.log(`   Date: ${data.data[0].date}`);
            } else if (data.Note) {
                console.log(`   ⚠️  API Limit: ${data.Note}`);
            } else if (data['Error Message']) {
                console.log(`   ❌ Error: ${data['Error Message']}`);
            } else {
                console.log(`   ❌ No data returned`);
                console.log(`   Full response:`, JSON.stringify(data, null, 2).substring(0, 1000));
            }

            // Wait between calls to avoid rate limit
            await new Promise(resolve => setTimeout(resolve, 13000));

        } catch (err) {
            console.log(`   ❌ ERROR: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test Complete!');
    console.log('='.repeat(80));
}

testBothYields();
