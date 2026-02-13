// Fix Alpha Vantage rate limit issue
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib', 'alpha-vantage.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace Promise.all with sequential calls
const oldCode = `export async function getAllTreasuryYields() {
    const [tenYear, thirtyYear] = await Promise.all([
        getTreasuryYield('10year'),
        getTreasuryYield('30year')
    ]);
    
    return {
        '10year': tenYear,
        '30year': thirtyYear
    };
}`;

const newCode = `export async function getAllTreasuryYields() {
    // Call 10-year first
    const tenYear = await getTreasuryYield('10year');
    
    // Wait 13 seconds to avoid rate limit (Alpha Vantage: 5 calls/minute = 12 sec minimum)
    await new Promise(resolve => setTimeout(resolve, 13000));
    
    // Call 30-year second
    const thirtyYear = await getTreasuryYield('30year');
    
    return {
        '10year': tenYear,
        '30year': thirtyYear
    };
}`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Fixed Alpha Vantage rate limit issue - changed to sequential calls');
