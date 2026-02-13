"use client";

import { Briefcase, Wallet, PieChart, TrendingUp, ChevronDown, ChevronUp, Bot, RefreshCw, AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { PortfolioUploader } from "./PortfolioUploader";
import { loadPortfolioFromStorage, getLastUpdateTime, type AccountData } from "@/lib/portfolio-parser";

// Types for our portfolio data
interface Holding {
    id: string; // Ticker or Code
    name: string;
    qty: number;
    avgCost: number;
    currentPrice?: number; // Fetched
}

interface Account {
    name: string;
    holdings: Holding[];
}

interface AIAnalysis {
    riskLevel: string;
    healthScore: number;
    assetAllocation: {
        dividendStocks: number;
        bonds: number;
        growthStocks: number;
    };
    concentrationRisks: string[];
    strengths: string[];
    recommendations: string[];
    analysis: string;
}

interface RebalancingAction {
    action: "BUY" | "SELL";
    ticker?: string;
    name: string;
    amount?: string;
    estimatedAmount?: string;
    reason: string;
}

interface Rebalancing {
    targetAllocation: {
        dividendStocks: number;
        bonds: number;
        growthStocks: number;
    };
    actions: RebalancingAction[];
    expectedImpact: string;
}

export function Portfolio() {
    const [expandedAccount, setExpandedAccount] = useState<string | null>("개인연금계좌");
    const [loading, setLoading] = useState(true);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [rebalancing, setRebalancing] = useState<Rebalancing | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [rebalLoading, setRebalLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Default portfolio data (fallback)
    const defaultAccounts: Account[] = [
        {
            name: "개인연금계좌",
            holdings: [
                { id: "0041D0.KS", name: "Kodex 미국AI소프트웨어TOP10", qty: 120, avgCost: 11817 },
                { id: "458730.KS", name: "Tiger 미국배당다우존스", qty: 4756, avgCost: 10589 },
                { id: "481180.KS", name: "Sol 미국AI소프트웨어", qty: 70, avgCost: 11929 },
                { id: "489250.KS", name: "Kodex 미국배당다우존스", qty: 1437, avgCost: 10394 },
            ]
        },
        {
            name: "퇴직연금계좌",
            holdings: [
                { id: "0041D0.KS", name: "Kodex 미국AI소프트웨어TOP10", qty: 150, avgCost: 11705 },
                { id: "453650.KS", name: "Kodex 미국S&P500금융", qty: 201, avgCost: 18715 },
                { id: "453850.KS", name: "Ace 미국30년국채액티브(H)", qty: 5095, avgCost: 7965 },
                { id: "458730.KS", name: "Tiger 미국배당다우존스", qty: 260, avgCost: 11709 },
                { id: "481180.KS", name: "Sol 미국AI소프트웨어", qty: 150, avgCost: 11901 },
                { id: "472870.KS", name: "Rise 미국30년국채엔화노출(합성H)", qty: 64, avgCost: 9973 },
                { id: "489250.KS", name: "Kodex 미국배당다우존스", qty: 371, avgCost: 10648 },
            ]
        },
        {
            name: "IRP계좌",
            holdings: [
                { id: "402970.KS", name: "Ace 미국배당다우존스", qty: 767, avgCost: 13345 },
                { id: "453850.KS", name: "Ace 미국30년국채액티브(H)", qty: 694, avgCost: 8324 },
                { id: "472870.KS", name: "Rise 미국30년국채엔화노출(합성H)", qty: 31, avgCost: 9065 },
                { id: "489250.KS", name: "Kodex 미국배당다우존스", qty: 279, avgCost: 11179 },
            ]
        }
    ];

    const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);

    const fetchKoreanPrices = async () => {
        setLoading(true);

        // Create a deep copy of accounts to update
        const updatedAccounts = await Promise.all(accounts.map(async (acc) => {
            const updatedHoldings = await Promise.all(acc.holdings.map(async (h) => {
                // Skip if no valid ticker
                if (!h.id || !h.id.includes(".")) {
                    return { ...h, currentPrice: h.currentPrice || h.avgCost };
                }

                // Korean stocks (.KS) - use API endpoint
                if (h.id.endsWith(".KS")) {
                    try {
                        const response = await fetch(`/api/korean-stock-price?symbol=${encodeURIComponent(h.id)}`);

                        if (!response.ok) {
                            console.error(`API error for ${h.name} (${h.id}):`, response.statusText);
                            return { ...h, currentPrice: h.avgCost }; // Fallback to avgCost
                        }

                        const data = await response.json();

                        if (data.error) {
                            console.warn(`No data for ${h.name} (${h.id}):`, data.error);
                            return { ...h, currentPrice: h.avgCost }; // Fallback to avgCost
                        }

                        return { ...h, currentPrice: data.currentPrice };
                    } catch (error) {
                        console.error(`Error fetching price for ${h.name} (${h.id}):`, error);
                        return { ...h, currentPrice: h.avgCost }; // Fallback to avgCost
                    }
                }

                // Non-Korean stocks - fallback to avgCost for now
                // TODO: Implement Yahoo Finance or alternative API for non-Korean stocks
                return { ...h, currentPrice: h.avgCost };
            }));

            return { ...acc, holdings: updatedHoldings };
        }));

        setAccounts(updatedAccounts);
        setLoading(false);
    };
    // Load portfolio from LocalStorage on mount
    useEffect(() => {
        const savedData = loadPortfolioFromStorage();
        if (savedData) {
            setAccounts(savedData as Account[]);
            console.log('Loaded portfolio from LocalStorage:', savedData);
        }

        const updateTime = getLastUpdateTime();
        setLastUpdate(updateTime);

        // Fetch prices only once on mount
        fetchKoreanPrices();
    }, []); // Empty dependency array - run only once on mount

    // Fetch AI Analysis
    // Fetch AI Analysis with 1-hour caching
    const fetchAIAnalysis = async () => {
        // Check cache first
        const cacheKey = 'portfolio_ai_analysis';
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const hourInMs = 60 * 60 * 1000; // 1 hour
                const isCacheValid = (Date.now() - timestamp) < hourInMs;

                if (isCacheValid) {
                    console.log('Using cached AI analysis (expires in', Math.round((hourInMs - (Date.now() - timestamp)) / 1000 / 60), 'minutes)');
                    setAiAnalysis(data);
                    return;
                }
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        // Fetch new analysis
        setAiLoading(true);
        try {
            const response = await fetch('/api/portfolio-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accounts,
                    totalValue: totalCurrentValue,
                    totalInvested
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('AI Analysis received:', data);

                // Cache the result
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                setAiAnalysis(data);
            } else {
                const errorText = await response.text();
                console.error('AI Analysis API error:', response.status, errorText);

                // Check if quota exceeded
                if (errorText.includes('quota') || errorText.includes('Too Many Requests')) {
                    alert('⚠️ AI 분석 할당량 초과\n\n무료 티어는 하루 20회 제한이 있습니다.\n잠시 후(약 1분) 다시 시도해주세요.');
                }
            }
        } catch (e) {
            console.error('AI Analysis failed:', e);
        } finally {
            setAiLoading(false);
        }
    };

    // Fetch Rebalancing Recommendations with 1-hour caching
    const fetchRebalancing = async () => {
        // Check cache first
        const cacheKey = 'portfolio_rebalancing';
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const hourInMs = 60 * 60 * 1000;
                const isCacheValid = (Date.now() - timestamp) < hourInMs;

                if (isCacheValid) {
                    console.log('Using cached rebalancing (expires in', Math.round((hourInMs - (Date.now() - timestamp)) / 1000 / 60), 'minutes)');
                    setRebalancing(data);
                    return;
                }
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        // Fetch new recommendations
        setRebalLoading(true);
        try {
            const response = await fetch('/api/portfolio-rebalancing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accounts,
                    totalValue: totalCurrentValue
                })
            });
            if (response.ok) {
                const data = await response.json();

                // Cache the result
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                setRebalancing(data);
            }
        } catch (e) {
            console.error('Rebalancing failed', e);
        } finally {
            setRebalLoading(false);
        }
    };

    // Auto-fetch AI analysis removed to save API quota
    // User must click button to analyze

    // Load cached analysis on mount
    useEffect(() => {
        const cacheKey = 'portfolio_ai_analysis';
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const hourInMs = 60 * 60 * 1000;
                const isCacheValid = (Date.now() - timestamp) < hourInMs;

                if (isCacheValid) {
                    setAiAnalysis(data);
                }
            } catch (e) {
                console.error('Cache load error:', e);
            }
        }
    }, []);

    // Calculate Totals
    const totalInvested = accounts.reduce((sum, acc) =>
        sum + acc.holdings.reduce((s, h) => s + (h.qty * h.avgCost), 0), 0
    );

    const totalCurrentValue = accounts.reduce((sum, acc) =>
        sum + acc.holdings.reduce((s, h) => s + (h.qty * (h.currentPrice || h.avgCost)), 0), 0
    );

    const totalGain = totalCurrentValue - totalInvested;
    const totalGainPercent = (totalGain / totalInvested) * 100;

    // Handle upload success
    const handleUploadSuccess = (newAccounts: AccountData[]) => {
        setAccounts(newAccounts as Account[]);
        const updateTime = getLastUpdateTime();
        setLastUpdate(updateTime);
    };

    return (
        <section className="glass-card col-span-3 md:col-span-1 p-6 h-fit">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                    <Briefcase className="text-sky-400 h-5 w-5" /> 내 포트폴리오
                </h2>
                {lastUpdate && (
                    <span className="text-[10px] text-slate-500">
                        업데이트: {lastUpdate.toLocaleDateString('ko-KR')} {lastUpdate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Portfolio Uploader */}
            <PortfolioUploader onUploadSuccess={handleUploadSuccess} />

            {/* Grand Total */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                <p className="text-xs text-slate-400 mb-1">총 자산 평가액</p>
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold text-white">
                        ₩{totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <div className="text-right">
                        <span className={cn("block text-sm font-bold", totalGain >= 0 ? "text-green-400" : "text-red-400")}>
                            {totalGain >= 0 ? '+' : ''}₩{totalGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className={cn("text-xs", totalGain >= 0 ? "text-green-400/80" : "text-red-400/80")}>
                            {totalGainPercent.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Analysis Section */}
            {aiAnalysis && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4" /> AI 포트폴리오 분석
                    </h3>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-black/20 p-3 rounded-lg text-center">
                            <div className="text-[10px] text-slate-400 mb-1">리스크 레벨</div>
                            <div className={cn(
                                "text-lg font-bold",
                                aiAnalysis.riskLevel === "High" ? "text-red-400" :
                                    aiAnalysis.riskLevel === "Medium" ? "text-amber-400" : "text-green-400"
                            )}>
                                {aiAnalysis.riskLevel}
                            </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg text-center">
                            <div className="text-[10px] text-slate-400 mb-1">건강도</div>
                            <div className="text-lg font-bold text-sky-400">{aiAnalysis.healthScore}/100</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg text-center">
                            <div className="text-[10px] text-slate-400 mb-1">성장주 비중</div>
                            <div className="text-lg font-bold text-purple-400">{aiAnalysis.assetAllocation.growthStocks}%</div>
                        </div>
                    </div>

                    {aiAnalysis.concentrationRisks.length > 0 && (
                        <div className="mb-3">
                            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400" /> 주요 리스크
                            </h4>
                            <ul className="text-xs text-slate-400 space-y-1">
                                {aiAnalysis.concentrationRisks.map((risk, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-0.5">•</span>
                                        <span>{risk}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {aiAnalysis.recommendations.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-400" /> 개선 제안
                            </h4>
                            <ul className="text-xs text-slate-400 space-y-1">
                                {aiAnalysis.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-400 mt-0.5">✓</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={fetchRebalancing}
                        disabled={rebalLoading}
                        className="mt-4 w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-3 w-3", rebalLoading && "animate-spin")} />
                        {rebalLoading ? '분석 중...' : '리밸런싱 제안 받기'}
                    </button>
                </div>
            )}

            {aiLoading && !aiAnalysis && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4 text-center">
                    <Bot className="h-8 w-8 text-purple-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-purple-300">AI가 포트폴리오를 분석 중입니다...</p>
                </div>
            )}

            {/* Manual AI Analysis Trigger */}
            {!aiAnalysis && !aiLoading && (
                <div className="mb-4">
                    <button
                        onClick={fetchAIAnalysis}
                        className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Bot className="h-4 w-4" />
                        🤖 AI 포트폴리오 분석 시작
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                        AI가 3-Bucket 전략 기반으로 리스크와 개선점을 분석합니다
                    </p>
                </div>
            )}

            {/* Rebalancing Recommendations */}
            {rebalancing && (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-semibold text-sky-300 flex items-center gap-2 mb-3">
                        <RefreshCw className="h-4 w-4" /> 리밸런싱 제안
                    </h3>

                    <div className="mb-4">
                        <div className="text-[10px] text-slate-400 mb-2">목표 자산 배분</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-black/20 p-2 rounded text-center">
                                <div className="text-slate-500 text-[9px]">배당주</div>
                                <div className="text-white font-bold">{rebalancing.targetAllocation.dividendStocks}%</div>
                            </div>
                            <div className="bg-black/20 p-2 rounded text-center">
                                <div className="text-slate-500 text-[9px]">채권</div>
                                <div className="text-white font-bold">{rebalancing.targetAllocation.bonds}%</div>
                            </div>
                            <div className="bg-black/20 p-2 rounded text-center">
                                <div className="text-slate-500 text-[9px]">성장주</div>
                                <div className="text-white font-bold">{rebalancing.targetAllocation.growthStocks}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-3">
                        {rebalancing.actions.map((action, i) => (
                            <div key={i} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <div className="flex items-start justify-between mb-1">
                                    <span className={cn(
                                        "text-xs font-bold px-2 py-0.5 rounded",
                                        action.action === "SELL"
                                            ? "bg-red-500/20 text-red-400 border border-red-500/20"
                                            : "bg-green-500/20 text-green-400 border border-green-500/20"
                                    )}>
                                        {action.action === "SELL" ? "매도" : "매수"}
                                    </span>
                                    <span className="text-xs text-slate-400">{action.amount || action.estimatedAmount}</span>
                                </div>
                                <div className="text-sm font-medium text-white mb-1">{action.name}</div>
                                <div className="text-xs text-slate-400">{action.reason}</div>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-slate-300 bg-black/20 p-3 rounded-lg">
                        <strong className="text-sky-400">예상 효과:</strong> {rebalancing.expectedImpact}
                    </div>
                </div>
            )}

            {/* Account List */}
            <div className="space-y-3">
                {accounts.map((acc) => {
                    const accValue = acc.holdings.reduce((s, h) => s + (h.qty * (h.currentPrice || h.avgCost)), 0);
                    const accInvested = acc.holdings.reduce((s, h) => s + (h.qty * h.avgCost), 0);
                    const accGain = accValue - accInvested;
                    const isExpanded = expandedAccount === acc.name;

                    return (
                        <div key={acc.name} className="glass-card !bg-slate-800/40 border-0 overflow-hidden">
                            <button
                                onClick={() => setExpandedAccount(isExpanded ? null : acc.name)}
                                className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex gap-3 items-center">
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                    <div className="text-left">
                                        <span className="block text-sm font-medium text-slate-200">{acc.name}</span>
                                        <span className="text-xs text-slate-500">₩{accValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                                <span className={cn("text-xs font-semibold", accGain >= 0 ? "text-green-400" : "text-red-400")}>
                                    {accGain >= 0 ? '+' : ''}{((accGain / accInvested) * 100).toFixed(2)}%
                                </span>
                            </button>

                            {/* Holdings Detail */}
                            {isExpanded && (
                                <div className="bg-black/20 p-3 space-y-3 border-t border-white/5">
                                    {acc.holdings.map(h => {
                                        const gain = (h.currentPrice || h.avgCost) - h.avgCost;
                                        const gainPercent = (gain / h.avgCost) * 100;
                                        return (
                                            <div key={h.id + h.name} className="flex justify-between items-start text-xs">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 font-medium">{h.name}</span>
                                                    <span className="text-slate-500">{h.qty.toLocaleString()}주</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-slate-200">
                                                        ₩{((h.currentPrice || h.avgCost) * h.qty).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <span className={cn(gain >= 0 ? "text-green-400" : "text-red-400")}>
                                                        {gainPercent.toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </section>
    );
}
