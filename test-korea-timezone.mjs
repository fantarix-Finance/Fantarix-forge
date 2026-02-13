// Test current date handling with Korea timezone
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

console.log('\n='.repeat(80));
console.log('🕐 Date/Time Check for Korea (KST, UTC+9)');
console.log('='.repeat(80));

// Current system time
const now = new Date();
console.log(`\nSystem Date (UTC): ${now.toUTCString()}`);
console.log(`System Date (Local): ${now.toString()}`);
console.log(`Timezone Offset: ${-now.getTimezoneOffset() / 60} hours from UTC`);

// Korea time (UTC+9)
const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
console.log(`\nKorea Time: ${koreaTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
console.log(`Korea Date: ${koreaTime.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
console.log(`Day of Week: ${koreaTime.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' })}`);

// Format as YYYYMMDD for KRX API (using Korea time)
function formatKoreaDate(date) {
    // Get Korea time components
    const koreaDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const koreaDate = new Date(koreaDateStr);

    const year = koreaDate.getFullYear();
    const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
    const day = String(koreaDate.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

const today = formatKoreaDate(now);
console.log(`\nFormatted for KRX API: ${today}`);

// Show next 7 days
console.log('\nNext 7 calendar days:');
for (let i = 0; i < 7; i++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + i);

    const formatted = formatKoreaDate(futureDate);
    const dayName = futureDate.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' });

    console.log(`  ${formatted} - ${dayName}`);
}

console.log('\n' + '='.repeat(80));
