"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FearGreedData {
    score: number;
    rating: string;
    timestamp: string;
    previousClose: number;
    previous1Week: number;
    previous1Month: number;
    previous1Year: number;
}

export function FearGreedIndex() {
    const [data, setData] = useState<FearGreedData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fear-greed');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('[FearGreedIndex] Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    // 색상 및 레이블 매핑
    const getRatingInfo = (score: number) => {
        if (score <= 25) return {
            label: '극도의 공포',
            labelEn: 'Extreme Fear',
            textColor: 'text-red-400',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20'
        };
        if (score <= 45) return {
            label: '공포',
            labelEn: 'Fear',
            textColor: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20'
        };
        if (score <= 55) return {
            label: '중립',
            labelEn: 'Neutral',
            textColor: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20'
        };
        if (score <= 75) return {
            label: '탐욕',
            labelEn: 'Greed',
            textColor: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
        };
        return {
            label: '극도의 탐욕',
            labelEn: 'Extreme Greed',
            textColor: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20'
        };
    };

    if (loading) {
        return (
            <section className="glass-card col-span-3 md:col-span-2 p-6 flex items-center justify-center min-h-[200px]">
                <div>
                    <div className="animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-slate-400">지수 로딩 중...</p>
                </div>
            </section>
        );
    }

    if (!data) {
        return (
            <section className="glass-card col-span-3 md:col-span-2 p-6">
                <p className="text-center text-slate-400">데이터를 불러올 수 없습니다</p>
            </section>
        );
    }

    const info = getRatingInfo(data.score);
    const change1Week = data.score - data.previous1Week;

    return (
        <section className="glass-card col-span-3 md:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                    <Activity className="text-sky-400 h-5 w-5" />
                    공포 탐욕 지수 (Fear & Greed Index)
                </h2>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">CNN Business</span>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="text-xs flex items-center gap-1 px-2 py-1 bg-sky-500/10 text-sky-400 rounded hover:bg-sky-500/20 transition-colors"
                    >
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gauge Visual */}
                <div className="md:col-span-2 flex flex-col items-center justify-center">
                    {/* Score Display */}
                    <div className={`text-7xl font-bold ${info.textColor} mb-2`}>
                        {Math.round(data.score)}
                    </div>

                    {/* Rating Badge */}
                    <div className={`${info.bgColor} ${info.borderColor} border px-6 py-2 rounded-full mb-6`}>
                        <span className={`${info.textColor} font-semibold text-lg`}>
                            {info.label}
                        </span>
                        <span className="text-slate-400 text-sm ml-2">({info.labelEn})</span>
                    </div>

                    {/* Gauge Bar */}
                    <div className="w-full max-w-md">
                        <div className="h-3 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 rounded-full relative shadow-lg">
                            {/* Indicator */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-xl transition-all duration-500"
                                style={{ left: `${data.score}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>0 (공포)</span>
                            <span>50 (중립)</span>
                            <span>100 (탐욕)</span>
                        </div>
                    </div>
                </div>

                {/* Historical Comparison */}
                <div className="space-y-4">
                    <div className={`${info.bgColor} ${info.borderColor} border p-4 rounded-lg`}>
                        <div className="text-xs text-slate-400 mb-1">전일 대비</div>
                        <div className="flex items-center gap-2">
                            {Math.round(data.score) > Math.round(data.previousClose) ? (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                            ) : Math.round(data.score) < Math.round(data.previousClose) ? (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                            ) : null}
                            <span className="text-2xl font-semibold text-white">
                                {Math.round(data.previousClose)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 p-4 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">1주일 전</div>
                        <div className="flex items-center gap-2">
                            {change1Week > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                            ) : change1Week < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                            ) : null}
                            <span className="text-2xl font-semibold text-white">
                                {Math.round(data.previous1Week)}
                            </span>
                            {change1Week !== 0 && (
                                <span className={`text-sm ${change1Week > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({change1Week > 0 ? '+' : ''}{Math.round(change1Week)})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 text-xs text-slate-500 border-t border-white/5 pt-4">
                <p className="leading-relaxed">
                    7가지 지표 종합 분석: 주가 모멘텀, 주가 강도, 시장 폭, 옵션 비율, 정크본드 수요, 변동성, 안전자산 수요
                </p>
            </div>
        </section>
    );
}
