// Test the /api/indices endpoint to verify ETF-to-index conversion
async function testIndexConversion() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('Testing ETF-to-Index Conversion');
        console.log('='.repeat(80));

        const response = await fetch('http://localhost:3000/api/indices');

        if (!response.ok) {
            console.log(`❌ API Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const indices = data.filter(item => item.category === 'index');

        console.log(`\nFound ${indices.length} indices:\n`);

        for (const item of indices) {
            console.log(`📊 ${item.name}`);
            console.log(`   Price: ${item.price.toLocaleString()}`);
            console.log(`   Change: ${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}%`);

            if (item.isEstimated) {
                console.log(`   ✅ Estimated from ${item.etfSymbol} ETF`);
            }

            // Validate expected ranges
            if (item.symbol === '^GSPC' && (item.price < 6000 || item.price > 7500)) {
                console.log(`   ⚠️  S&P 500 value ${item.price} is outside expected range (6000-7500)`);
            } else if (item.symbol === '^DJI' && (item.price < 45000 || item.price > 55000)) {
                console.log(`   ⚠️  Dow Jones value ${item.price} is outside expected range (45000-55000)`);
            } else if (item.symbol === '^IXIC' && (item.price < 20000 || item.price > 25000)) {
                console.log(`   ⚠️  Nasdaq value ${item.price} is outside expected range (20000-25000)`);
            } else if (item.isEstimated) {
                console.log(`   ✓ Value is within expected range`);
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

testIndexConversion();
