"use client";

import { AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw, Bot, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RiskFactor {
    id: string;
    category: "거시경제" | "유동성" | "시스템" | "지정학";
    level: "위험 (High)" | "주의 (Medium)" | "안정 (Low)";
    title: string;
    summary: string;
    confidence?: number;
}

export function RiskMonitor() {
    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [risks, setRisks] = useState<RiskFactor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    // Cache countdown timer (8 hours)
    useEffect(() => {
        if (!lastUpdated) return;

        const updateTimer = () => {
            const cacheKey = 'risk_monitor_analysis';
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const { timestamp } = JSON.parse(cachedData);
                    const eightHoursInMs = 8 * 60 * 60 * 1000;
                    const diff = (timestamp + eightHoursInMs) - Date.now();

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
                } catch (e) {
                    console.error('Timer update error:', e);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [lastUpdated]);

    // Fetch AI-analyzed risks with 8-hour caching
    const fetchRisks = async (force = false) => {
        // Check cache first (unless force refresh)
        if (!force) {
            const cacheKey = 'risk_monitor_analysis';
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const { data, timestamp } = JSON.parse(cachedData);
                    const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours
                    const isCacheValid = (Date.now() - timestamp) < eightHoursInMs;

                    if (isCacheValid) {
                        console.log('Using cached risk analysis (expires in', Math.round((eightHoursInMs - (Date.now() - timestamp)) / 1000 / 60), 'minutes)');
                        setRisks(data.risks || []);
                        if (data.metadata?.updateTime) {
                            const updateTime = new Date(data.metadata.updateTime);
                            setLastUpdated(updateTime.toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            }));
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Cache parse error:', e);
                }
            }
        }

        // Fetch new analysis
        setLoading(true);
        setError("");
        try {
            const url = force
                ? `/api/risk-analysis?_t=${Date.now()}`
                : '/api/risk-analysis';

            const res = await fetch(url, {
                cache: force ? 'no-store' : 'default'
            });
            const data = await res.json();

            if (data.error) {
                setError(data.message || ' Failed to fetch risk analysis');

                // Check for quota exceeded
                if (data.message?.includes('quota') || data.message?.includes('Too Many Requests')) {
                    alert('⚠️ AI 분석 할당량 초과\n\n무료 티어는 하루 20회 제한이 있습니다.\n잠시 후(약 1분) 다시 시도해주세요.');
                }

                setRisks([]);

            } else {
                // Cache the result
                const cacheKey = 'risk_monitor_analysis';
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                setRisks(data.risks || []);

                // Set update time
                if (data.metadata?.updateTime) {
                    const updateTime = new Date(data.metadata.updateTime);
                    setLastUpdated(updateTime.toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }));
                }
            }
        } catch (err: any) {
            console.error('Risk fetch error:', err);
            setError('네트워크 오류가 발생했습니다');
            setRisks([]);
        } finally {
            setLoading(false);
        }
    };

    // Load cached risks on mount
    useEffect(() => {
        const cacheKey = 'risk_monitor_analysis';
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours
                const isCacheValid = (Date.now() - timestamp) < eightHoursInMs;

                if (isCacheValid) {
                    setRisks(data.risks || []);
                    if (data.metadata?.updateTime) {
                        const updateTime = new Date(data.metadata.updateTime);
                        setLastUpdated(updateTime.toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        }));
                    }
                }
            } catch (e) {
                console.error('Cache load error:', e);
            }
        }
    }, []);

    return (
        <section className="glass-card col-span-3 md:col-span-1 p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                        <ShieldAlert className="text-red-400 h-5 w-5" /> 리스크 모니터
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {lastUpdated ? `업데이트: ${lastUpdated}` : 'AI 분석 대기 중'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Cache Timer */}
                    {timeRemaining && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-full border border-slate-600/50">
                            <Activity className="h-3 w-3 text-red-400" />
                            <span className="text-xs text-slate-400">{timeRemaining}</span>
                        </div>
                    )}

                    <button
                        onClick={() => fetchRisks(true)}
                        disabled={loading}
                        className="text-slate-600 hover:text-white transition-colors disabled:opacity-50"
                        title="캐시 무시하고 새로 분석"
                    >
                        <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Manual Trigger Button */}
            {risks.length === 0 && !loading && (
                <div className="mb-4">
                    <button
                        onClick={() => fetchRisks(false)}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Bot className="h-4 w-4" />
                        🛡️ AI 리스크 분석 시작
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                        거시경제, 유동성, 시스템, 지정학 리스크를 AI가 분석합니다
                    </p>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Bot className="h-12 w-12 text-red-400 mb-3 animate-pulse" />
                    <p className="text-xs text-slate-400">AI가 시장 리스크를 분석 중입니다...</p>
                </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {risks.map((risk) => (
                    <div key={risk.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide",
                                risk.level === "위험 (High)" ? "bg-red-500/20 text-red-400 border border-red-500/20" :
                                    risk.level === "주의 (Medium)" ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
                                        "bg-green-500/20 text-green-400 border border-green-500/20"
                            )}>
                                {risk.level}
                            </span>
                            <span className="text-xs text-slate-500">{risk.category}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-200 mb-1 leading-tight">{risk.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {risk.summary}
                        </p>
                    </div>
                ))}

                {risks.length === 0 && !loading && lastUpdated && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                        <CheckCircle2 className="h-8 w-8 opacity-20" />
                        <span className="text-xs">감지된 핵심 리스크가 없습니다.</span>
                    </div>
                )}
            </div>
        </section>
    );
}
