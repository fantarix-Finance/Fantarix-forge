"use client";

import { Radar, TrendingDown, BarChart3, Bot, RefreshCw, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Position52Week {
    position: number;
    fromHigh: number;
    fromLow: number;
    interpretation: string;
}

interface StockOpportunity {
    ticker: string;
    name: string;
    currentPrice: number;
    position52Week: Position52Week;
}

interface SectorOpportunity {
    sectorKey: string;
    sectorEn: string;
    sectorKo: string;
    etf: string;
    position52Week: Position52Week;
    stocks: StockOpportunity[];
    aiAnalysis?: string;
}

interface MarketIntel {
    success: boolean;
    analyzedAt: string;
    cacheExpiresAt?: string;
    totalSectorsAnalyzed: number;
    weakestSectors: SectorOpportunity[];
}

export function OpportunityRadar() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MarketIntel | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        fetchOpportunities();
    }, []);

    // Cache countdown timer
    useEffect(() => {
        if (!data?.cacheExpiresAt) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expires = new Date(data.cacheExpiresAt!).getTime();
            const diff = expires - now;

            if (diff <= 0) {
                setTimeRemaining('만료됨');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [data?.cacheExpiresAt]);

    const fetchOpportunities = async (force = false) => {
        setLoading(true);
        try {
            // ?forceRefresh=true → server-side memory cache invalidation
            // Without this, force=true only bypasses browser cache but server
            // still returns the cached (possibly stale/error) response.
            const url = force
                ? `/api/market-intelligence?forceRefresh=true`
                : '/api/market-intelligence';

            const res = await fetch(url, {
                cache: 'no-store'  // Always bypass browser cache
            });
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('[OpportunityRadar] Fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="glass-card col-span-3 md:col-span-2 p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                    <Radar className="text-sky-400 h-5 w-5" /> 섹터 기회 포착
                </h2>
                <div className="flex items-center gap-3">
                    {/* Cache Timer */}
                    {timeRemaining && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 rounded-full border border-slate-600/50">
                            <Activity className="h-3 w-3 text-sky-400" />
                            <span className="text-xs text-slate-400">{timeRemaining}</span>
                        </div>
                    )}

                    <button
                        onClick={() => fetchOpportunities(true)}
                        disabled={loading}
                        title="캐시 무시하고 새로 분석"
                        className="text-xs flex items-center gap-1 px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-lg hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                        {loading ? '분석 중...' : '강제 새로고침'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full mb-3" />
                    <p className="text-sm text-slate-400">섹터 분석 중...</p>
                </div>
            ) : data?.weakestSectors && data.weakestSectors.length > 0 ? (
                <>
                    <div className="text-xs text-slate-500 mb-4">
                        분석 완료: {new Date(data.analyzedAt).toLocaleString('ko-KR')} | {data.totalSectorsAnalyzed}개 섹터 분석 → 하위 3개 선별
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        {data.weakestSectors.map((sector, idx) => (
                            <div
                                key={sector.sectorKey}
                                className="bg-gradient-to-br from-purple-500/5 via-sky-500/5 to-pink-500/5 border border-white/10 rounded-xl p-5 hover:border-sky-500/30 transition-all"
                            >
                                {/* Sector Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-base font-bold text-white">{sector.sectorKo}</span>
                                            <span className="text-xs text-slate-400">{sector.sectorEn}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            섹터 ETF: {sector.etf}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-green-400">
                                            {sector.position52Week.fromHigh.toFixed(1)}% from High
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            52주 {sector.position52Week.position.toFixed(0)}% 위치
                                        </div>
                                    </div>
                                </div>

                                {/* Sector 52-Week Position Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>52주 최저</span>
                                        <span className="text-slate-300">{sector.position52Week.interpretation}</span>
                                        <span>52주 최고</span>
                                    </div>
                                    <div className="relative h-3 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-green-500/40 via-yellow-500/40 to-red-500/40" />
                                        <div
                                            className="absolute top-0 h-full w-1.5 bg-white shadow-lg shadow-white/50"
                                            style={{ left: `${sector.position52Week.position}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Representative Stocks (3개) */}
                                <div className="mb-4">
                                    <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        대표 주식
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {sector.stocks.map(stock => (
                                            <div
                                                key={stock.ticker}
                                                className="bg-black/20 border border-white/5 rounded-lg p-3 hover:bg-black/30 transition-colors"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <span className="text-sm font-bold text-white">{stock.ticker}</span>
                                                        <span className="text-xs text-slate-400 ml-2">{stock.name}</span>
                                                    </div>
                                                    <div className="text-sm font-semibold text-white">
                                                        ${stock.currentPrice.toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* Stock 52-Week Position Mini Bar */}
                                                <div>
                                                    <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                                                        <span>52W: {stock.position52Week.position.toFixed(0)}%</span>
                                                        <span className="text-green-400">{stock.position52Week.fromHigh.toFixed(1)}% from High</span>
                                                    </div>
                                                    <div className="relative h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-green-500/30 via-yellow-500/30 to-red-500/30" />
                                                        <div
                                                            className="absolute top-0 h-full w-1 bg-sky-400"
                                                            style={{ left: `${stock.position52Week.position}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Sector Analysis */}
                                {sector.aiAnalysis && (
                                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bot className="h-4 w-4 text-purple-400" />
                                            <span className="text-xs font-semibold text-purple-300">섹터 AI 분석</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">{sector.aiAnalysis}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">현재 투자 기회 신호가 없습니다</p>
                    <p className="text-xs text-slate-500 mt-1">시장 상황이 변화하면 자동으로 감지됩니다</p>
                </div>
            )}
        </section>
    );
}
