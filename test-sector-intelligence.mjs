// Test Market Intelligence Sector-Based API
// Tests the new sector analysis endpoint

const API_URL = 'http://localhost:3000/api/market-intelligence';

console.log('Testing Market Intelligence (Sector-Based)...\n');

try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.success) {
        console.error('❌ API Error:', data.error);
        process.exit(1);
    }

    console.log(`✅ Success! Analyzed ${data.totalSectorsAnalyzed} sectors`);
    console.log(`📊 Found ${data.weakestSectors.length} weakest sectors:\n`);

    data.weakestSectors.forEach((sector, index) => {
        console.log(`${index + 1}. ${sector.sectorKo} (${sector.sectorEn})`);
        console.log(`   ETF: ${sector.etf}`);
        console.log(`   52주 위치: ${(sector.position52Week.position * 100).toFixed(0)}%`);
        console.log(`   고점 대비: ${sector.position52Week.fromHigh.toFixed(1)}%`);
        console.log(`   저점 대비: ${sector.position52Week.fromLow.toFixed(1)}%`);
        console.log(`   대표 주식:`);

        sector.stocks.forEach(stock => {
            console.log(`      - ${stock.name} (${stock.ticker}): $${stock.currentPrice.toFixed(2)}`);
            console.log(`        52주 위치: ${(stock.position52Week.position * 100).toFixed(0)}%`);
        });

        if (sector.aiAnalysis) {
            console.log(`   AI 분석: ${sector.aiAnalysis}`);
        }
        console.log('');
    });

    console.log('✅ Test Complete!');

} catch (error) {
    console.error('❌ Test Failed:', error.message);
    process.exit(1);
}
