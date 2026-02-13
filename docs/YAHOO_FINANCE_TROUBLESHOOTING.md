# Yahoo Finance 2 한국 주식 연동 문제 해결 가이드

## 문제 요약

**증상**: 한국 주식(KOSPI/KOSDAQ) ETF의 현재가를 가져오지 못해 포트폴리오의 모든 수익률이 0.00%로 표시됨

**원인**: yahoo-finance2 라이브러리의 v3 버전부터 사용법이 변경됨

**해결**: YahooFinance 클래스의 인스턴스를 명시적으로 생성해야 함

---

## 상세 문제 분석

### 1. 발생했던 오류 메시지

```
Error: Call `const yahooFinance = new YahooFinance().quote(...)`
TypeError: yahooFinance.setGlobalConfig is not a function
Failed to fetch price for 458730.KS
```

### 2. 근본 원인

yahoo-finance2 라이브러리가 **v3.x으로 업데이트**되면서 API 사용 방식이 변경되었습니다:

#### ❌ 잘못된 방식 (v2 이하)
```javascript
import yahooFinance from 'yahoo-finance2';
const quote = await yahooFinance.quote('458730.KS');
```

#### ✅ 올바른 방식 (v3+)
```javascript
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
const quote = await yahooFinance.quote('458730.KS');
```

### 3. 라이브러리 버전 확인

현재 프로젝트에서 사용 중인 버전:
- `package.json`: `"yahoo-finance2": "^3.13.0"`

---

## 해결 방법

### Next.js API Route에서의 적용

**파일**: `app/api/korean-stock-price/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        // ✅ 올바른 v3 방식
        const YahooFinanceModule = await import('yahoo-finance2');
        const YahooFinance = YahooFinanceModule.default;
        
        // 인스턴스 생성 (필수!)
        const yahooFinance = new YahooFinance();
        
        // quote 메서드 호출
        const quote = await yahooFinance.quote(symbol) as any;

        if (!quote || !quote.regularMarketPrice) {
            return NextResponse.json({
                error: 'No price data available',
                symbol
            }, { status: 404 });
        }

        return NextResponse.json({
            symbol: quote.symbol,
            currentPrice: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            // ... 기타 필드
        });

    } catch (error: any) {
        console.error(`Failed to fetch price for ${symbol}:`, error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch price data',
            symbol
        }, { status: 500 });
    }
}
```

### 일반 Node.js/ESM 스크립트에서의 적용

```javascript
import YahooFinance from 'yahoo-finance2';

async function fetchKoreanStock() {
    // 인스턴스 생성
    const yahooFinance = new YahooFinance();
    
    // 한국 주식 심볼 (예: KOSPI ETF)
    const symbol = '458730.KS';
    
    try {
        const quote = await yahooFinance.quote(symbol);
        console.log('Price:', quote.regularMarketPrice);
        console.log('Change %:', quote.regularMarketChangePercent);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchKoreanStock();
```

---

## 진단 방법

### 1. 기본 테스트 스크립트

문제가 발생하면 간단한 테스트 스크립트로 확인:

```javascript
// test-yahoo.mjs
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const result = await yahooFinance.quote('458730.KS');

console.log('Success:', result.regularMarketPrice);
```

실행:
```bash
node test-yahoo.mjs
```

### 2. API 엔드포인트 직접 테스트

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/korean-stock-price?symbol=458730.KS" | ConvertTo-Json

# 또는 curl
curl http://localhost:3000/api/korean-stock-price?symbol=458730.KS
```

### 3. 브라우저 개발자 도구

1. F12로 개발자 도구 열기
2. **Network 탭**: `/api/korean-stock-price` 호출 상태 확인
3. **Console 탭**: JavaScript 오류 메시지 확인

---

## 한국 주식 심볼 형식

### KOSPI (Korea Composite Stock Price Index)
- 접미사: `.KS`
- 예시: `458730.KS` (Tiger 미국배당다우존스)

### KOSDAQ (Korea Securities Dealers Automated Quotations)
- 접미사: `.KQ`
- 예시: `123456.KQ`

### 주의사항

1. **심볼 형식이 정확해야 함**: 접미사 `.KS` 또는 `.KQ` 필수
2. **거래 시간 외 데이터**: 장 마감 후에도 `regularMarketPrice`는 마지막 종가를 반환
3. **데이터 지연**: 실시간이 아닌 약간의 지연이 있을 수 있음

---

## 자주 발생하는 문제들

### 문제 1: "yahooFinance.setGlobalConfig is not a function"

**원인**: v3에서는 `setGlobalConfig` 메서드가 제거됨

**해결**: 인스턴스 생성 시 설정 전달
```javascript
const yahooFinance = new YahooFinance({
    queue: { timeout: 60000 }
});
```

### 문제 2: "Property 'regularMarketPrice' does not exist"

**원인**: TypeScript 타입 추론 오류

**해결**: `as any` 타입 캐스팅
```typescript
const quote = await yahooFinance.quote(symbol) as any;
```

### 문제 3: API가 404 또는 500 오류 반환

**진단 체크리스트**:
1. ✅ 심볼 형식이 올바른가? (예: `458730.KS`)
2. ✅ `new YahooFinance()` 인스턴스를 생성했는가?
3. ✅ 네트워크 연결이 정상인가?
4. ✅ Yahoo Finance 서비스가 정상인가? ([Yahoo Finance](https://finance.yahoo.com)에서 해당 심볼 조회 가능한지 확인)

---

## 참고 자료

- **yahoo-finance2 공식 문서**: [npm](https://www.npmjs.com/package/yahoo-finance2)
- **GitHub 레포지토리**: [gadicc/node-yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2)
- **Breaking Changes (v3)**: [CHANGELOG](https://github.com/gadicc/node-yahoo-finance2/blob/main/CHANGELOG.md)

---

## 문서 이력

| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-02-05 | AI Assistant | 초기 작성: yahoo-finance2 v3 마이그레이션 가이드 |

---

## 요약

**핵심 포인트**:
1. yahoo-finance2 v3부터는 `new YahooFinance()` 인스턴스 생성이 필수
2. 한국 주식은 `.KS` (KOSPI) 또는 `.KQ` (KOSDAQ) 접미사 필요
3. API 오류 시 테스트 스크립트로 빠르게 진단
4. TypeScript 사용 시 `as any` 타입 캐스팅 권장

이 가이드를 참고하면 비슷한 문제 발생 시 빠르게 해결할 수 있습니다.
