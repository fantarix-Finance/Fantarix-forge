"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketItem {
    name: string;
    symbol: string;
    category: string;
    price: number;
    change: number;
    isPositive: boolean;
    error?: boolean;
    timestamp?: string;
    marketState?: string;
    errorMessage?: string;
    isEstimated?: boolean;  // True if price is estimated from ETF
    etfSymbol?: string;     // ETF symbol if estimated
    isTreasuryYield?: boolean;  // True if this is a treasury yield (display as percentage)
}

export function MarketIndices() {
    const [data, setData] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/indices');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to fetch");
            }
            const result = await res.json();
            if (Array.isArray(result)) {
                setData(result);
                // Check if all items have errors
                const allErrors = result.every((item: MarketItem) => item.error);
                if (allErrors) {
                    setError('일시적으로 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
                }
            }
        } catch (error) {
            console.error("Failed to fetch markets", error);
            setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' });
    };

    const indices = (data || []).filter(item => item.category === 'index');
    const macros = (data || []).filter(item => item.category === 'macro');
    const sectors = (data || []).filter(item => item.category === 'sector');

    const renderCard = (item: MarketItem) => {
        const getMarketStateBadge = () => {
            if (!item.marketState || item.marketState === 'UNKNOWN') return null;

            const stateColors = {
                'REGULAR': 'bg-green-500/20 text-green-400 border-green-500/30',
                'PRE': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                'POST': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                'CLOSED': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                'PREPRE': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                'POSTPOST': 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            };

            const colorClass = stateColors[item.marketState as keyof typeof stateColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

            return (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colorClass} uppercase tracking-wide`}>
                    {item.marketState}
                </span>
            );
        };

        return (
            <div key={item.symbol} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between hover:bg-slate-800 transition-colors group relative">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm font-medium">{item.name}</span>
                            {item.isEstimated && item.etfSymbol && (
                                <span
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium"
                                    title={`${item.etfSymbol} ETF 기반 추정치`}
                                >
                                    ETF 기반
                                </span>
                            )}
                        </div>
                        {getMarketStateBadge()}
                    </div>
                    {item.timestamp && <span className="text-[10px] text-slate-500">{formatTime(item.timestamp)}</span>}
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white tracking-tight" title={item.error ? item.errorMessage : undefined}>
                        {item.error ? "Err" : (
                            item.isTreasuryYield
                                ? `${item.price.toFixed(2)}%`  // Display as percentage for treasury yields
                                : Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        )}
                    </span>
                    <div className={cn("flex items-center text-sm font-medium mt-1", item.isPositive ? "text-emerald-400" : "text-rose-400")}>
                        {item.isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        <span>{item.change > 0 ? "+" : ""}{Number(item.change).toFixed(2)}%</span>
                    </div>
                </div>
                {item.error && item.errorMessage && (
                    <div className="absolute inset-0 bg-rose-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                        <span className="text-[10px] text-rose-400 bg-slate-900/90 px-2 py-1 rounded">{item.errorMessage}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderSector = (item: MarketItem) => (
        <div key={item.symbol} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs font-semibold">{item.name}</span>
                <span className={cn("text-xs font-bold", item.isPositive ? "text-emerald-400" : "text-rose-400")}>
                    {item.change > 0 ? "+" : ""}{Number(item.change).toFixed(2)}%
                </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", item.isPositive ? "bg-emerald-500" : "bg-rose-500")}
                    style={{ width: `${Math.min(Math.abs(item.change) * 20, 100)}%` }}
                />
            </div>
        </div>
    );

    return (
        <section className="glass-card col-span-3 md:col-span-2 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-200 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" />
                    주요 시장 지표 (Major Indices)
                </h2>
                <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                    <RefreshCw className={cn("w-4 h-4 text-slate-400", loading && "animate-spin")} />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                            <p className="text-amber-400 font-medium text-sm">{error}</p>
                            <p className="text-amber-400/70 text-xs mt-1">
                                새로고침 버튼을 클릭하거나 잠시 후 다시 시도해주세요.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {indices.map(renderCard)}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
                <h3 className="text-md font-semibold text-slate-300 mb-4 flex items-center">
                    <span className="mr-2">🌍</span> 원자재 & 매크로 (Commodities & Macro)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {macros.map(renderCard)}
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
                <h3 className="text-md font-semibold text-slate-300 mb-4 flex items-center">
                    <span className="mr-2">🏭</span> 섹터 퍼포먼스 (Sector Heatmap)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {sectors.map(renderSector)}
                </div>
            </div>
        </section>
    );
}
