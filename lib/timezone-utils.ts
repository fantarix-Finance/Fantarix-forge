// Timezone utilities for Korean market time vs US market time
import { format, subDays, addHours } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Korean market hours: 9:00 AM - 3:30 PM KST
 * US market hours: 9:30 AM - 4:00 PM EST (10:30 PM - 5:00 AM KST next day)
 * 
 * Important: When it's 7:00 AM in Korea, we need to reference the PREVIOUS day's US market data
 */

const KOREA_TZ = 'Asia/Seoul';
const US_EAST_TZ = 'America/New_York';

/**
 * Get the relevant US market date for a given Korean time
 * If Korean time is before 5:00 AM (US market close), use previous day
 */
export function getUSMarketDateForKoreanTime(koreanDate: Date = new Date()): Date {
    const koreanTime = toZonedTime(koreanDate, KOREA_TZ);
    const hour = koreanTime.getHours();

    // If it's before 5:00 AM KST, US market hasn't closed yet
    // So we need to use the previous day's data
    if (hour < 5) {
        return subDays(koreanTime, 1);
    }

    // If it's between 5:00 AM and next day's 10:30 PM, use current day
    return koreanTime;
}

/**
 * Check if US market is currently open (from Korean perspective)
 */
export function isUSMarketOpen(koreanDate: Date = new Date()): boolean {
    const koreanTime = toZonedTime(koreanDate, KOREA_TZ);
    const usTime = toZonedTime(koreanDate, US_EAST_TZ);

    const hour = usTime.getHours();
    const minute = usTime.getMinutes();

    // US market: 9:30 AM - 4:00 PM EST
    const isWeekday = usTime.getDay() >= 1 && usTime.getDay() <= 5;
    const isMarketHours =
        (hour > 9 || (hour === 9 && minute >= 30)) &&
        hour < 16;

    return isWeekday && isMarketHours;
}

/**
 * Get Korean market open/close status
 */
export function isKoreanMarketOpen(koreanDate: Date = new Date()): boolean {
    const koreanTime = toZonedTime(koreanDate, KOREA_TZ);
    const hour = koreanTime.getHours();
    const minute = koreanTime.getMinutes();

    // Korean market: 9:00 AM - 3:30 PM KST
    const isWeekday = koreanTime.getDay() >= 1 && koreanTime.getDay() <= 5;
    const isMarketHours =
        hour >= 9 &&
        (hour < 15 || (hour === 15 && minute <= 30));

    return isWeekday && isMarketHours;
}

/**
 * Format date for display
 */
export function formatKoreanDateTime(date: Date = new Date()): string {
    const koreanTime = toZonedTime(date, KOREA_TZ);
    return format(koreanTime, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Get market status message
 */
export function getMarketStatusMessage(): string {
    const now = new Date();
    const usOpen = isUSMarketOpen(now);
    const krOpen = isKoreanMarketOpen(now);

    if (krOpen) {
        return '🇰🇷 한국 장 오픈';
    } else if (usOpen) {
        return '🇺🇸 미국 장 오픈';
    } else {
        return '📊 장 마감';
    }
}

/**
 * Calculate the lookback period for price analysis
 * For Korean morning (7 AM), we look at previous day's US close
 */
export function getPriceAnalysisPeriod(daysBack: number = 5): { start: Date; end: Date } {
    const now = new Date();
    const marketDate = getUSMarketDateForKoreanTime(now);
    const start = subDays(marketDate, daysBack);

    return { start, end: marketDate };
}
