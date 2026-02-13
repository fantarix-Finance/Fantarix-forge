// Quick test to verify treasury yields API
async function testTreasuryYields() {
    console.log('\n' + '='.repeat(80));
    console.log('Testing Treasury Yields Integration');
    console.log('='.repeat(80));

    try {
        const response = await fetch('http://localhost:3000/api/indices');

        if (!response.ok) {
            console.log(`❌ API Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const indices = data.filter(item => item.category === 'index');

        console.log(`\nFound ${indices.length} indices:\n`);

        for (const item of indices) {
            console.log(`📊 ${item.name} (${item.symbol})`);

            if (item.isTreasuryYield) {
                console.log(`   ✅ Treasury Yield: ${item.price.toFixed(2)}%`);
            } else if (item.isEstimated) {
                console.log(`   Price: ${item.price.toLocaleString()} (estimated from ${item.etfSymbol})`);
            } else {
                console.log(`   Price: ${item.price.toLocaleString()}`);
            }

            console.log(`   Change: ${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}%`);
            console.log('');
        }

        // Also check commodities
        const macros = data.filter(item => item.category === 'macro');
        console.log(`\nCommodities & Macro (${macros.length}):\n`);

        for (const item of macros) {
            console.log(`📊 ${item.name}`);
            console.log(`   Price: ${item.price.toLocaleString()}`);
            console.log(`   Change: ${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}%`);
            console.log('');
        }

        console.log('='.repeat(80));
        console.log('✅ Test Complete!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testTreasuryYields();
