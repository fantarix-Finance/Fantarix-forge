// Test the API endpoint directly
async function testAPIEndpoint() {
    console.log('\n' + '='.repeat(80));
    console.log('Testing /api/indices Endpoint');
    console.log('='.repeat(80));

    try {
        const response = await fetch('http://localhost:3000/api/indices');

        if (!response.ok) {
            console.log(`❌ API Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const indices = data.filter(item => item.category === 'index');

        console.log(`\n📊 Index Data:\n`);

        for (const item of indices) {
            const status = item.error ? '❌ ERROR' : '✅ OK';
            console.log(`${status} ${item.name} (${item.symbol})`);

            if (item.isTreasuryYield) {
                if (item.error) {
                    console.log(`   Error: ${item.errorMessage || 'Unknown error'}`);
                } else {
                    console.log(`   Yield: ${item.price.toFixed(2)}%`);
                }
            } else if (item.isEstimated) {
                console.log(`   Price: ${item.price.toLocaleString()} (from ${item.etfSymbol})`);
            } else {
                console.log(`   Price: ${item.price.toLocaleString()}`);
            }
            console.log('');
        }

        console.log('='.repeat(80));
        console.log('✅ Test Complete!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPIEndpoint();
