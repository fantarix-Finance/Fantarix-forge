// Test KRX REST API integration with command line arguments
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });

/**
 * Format date as YYYYMMDD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Get stock price from KRX API
 */
async function getStockPrice(ticker, symbol) {
    const market = symbol.endsWith('.KS') ? 'KOSPI' : 'KOSDAQ';
    const url = market === 'KOSPI'
        ? 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd'
        : 'https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd';

    const basDd = formatDate(new Date());
    const requestUrl = `${url}?basDd=${basDd}`;

    console.log(`\nFetching data for ${ticker} (${market}) on ${basDd}...`);
    console.log(`URL: ${requestUrl}`);

    const apiKey = process.env.KRX_API_KEY;
    if (!apiKey) {
        throw new Error('KRX_API_KEY is not set in .env.local file');
    }

    const response = await fetch(requestUrl, {
        headers: {
            'Content-Type': 'application/json',
            'AUTH_KEY': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`KRX API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.OutBlock_1?.length || 0} stocks from KRX API`);

    // Find the stock in the response
    const stockData = data.OutBlock_1?.find(stock => stock.ISU_CD === ticker);

    if (!stockData) {
        console.warn(`\n❌ Stock ${ticker} not found in ${market} market`);
        console.log('\nSearching for similar codes...');
        const similar = data.OutBlock_1?.filter(s =>
            s.ISU_CD.includes(ticker) || s.ISU_NM.includes('Tiger') || s.ISU_NM.includes('Kodex')
        ).slice(0, 10);

        if (similar && similar.length > 0) {
            console.log('\n📋 Similar stocks found:');
            similar.forEach(s => {
                console.log(`   ${s.ISU_CD} - ${s.ISU_NM} - ${s.TDD_CLSPRC} KRW`);
            });
        }
        return null;
    }

    return {
        ticker,
        symbol,
        market,
        name: stockData.ISU_NM,
        currentPrice: parseFloat(stockData.TDD_CLSPRC.replace(/,/g, '')),
        changePercent: parseFloat(stockData.FLUC_RT),
        open: parseFloat(stockData.TDD_OPNPRC.replace(/,/g, '')),
        high: parseFloat(stockData.TDD_HGPRC.replace(/,/g, '')),
        low: parseFloat(stockData.TDD_LWPRC.replace(/,/g, '')),
        volume: parseInt(stockData.ACC_TRDVOL.replace(/,/g, '')),
        marketCap: parseInt(stockData.MKTCAP.replace(/,/g, '')),
    };
}

/**
 * Test Korean stock with command line argument
 */
async function testKRXAPI() {
    console.log('='.repeat(60));
    console.log('KRX REST API Test');
    console.log('='.repeat(60));

    // Get ticker from command line or use defaults
    const cliTicker = process.argv[2];

    const testStocks = cliTicker ? [
        { ticker: cliTicker, symbol: `${cliTicker}.KS`, name: 'Custom Stock' }
    ] : [
        { ticker: '005930', symbol: '005930.KS', name: 'Samsung Electronics' },
        { ticker: '458730', symbol: '458730.KS', name: 'Tiger 미국배당다우존스' },
        { ticker: '489250', symbol: '489250.KS', name: 'Kodex 미국배당다우존스' },
    ];

    for (const stock of testStocks) {
        try {
            console.log(`\n📊 Testing ${stock.name} (${stock.ticker})...`);
            const result = await getStockPrice(stock.ticker, stock.symbol);

            if (result) {
                console.log('\n✅ Success!');
                console.log(`   Name: ${result.name}`);
                console.log(`   Price: ${result.currentPrice.toLocaleString()} KRW`);
                console.log(`   Change: ${result.changePercent > 0 ? '+' : ''}${result.changePercent}%`);
                console.log(`   Volume: ${result.volume.toLocaleString()}`);
                console.log(`   Market Cap: ${(result.marketCap / 1000000).toLocaleString()} M KRW`);
            } else {
                console.log('❌ Stock not found');
            }
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test completed');
    console.log('='.repeat(60));
}

// Run the test
testKRXAPI().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
