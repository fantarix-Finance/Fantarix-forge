"use client";

import { useState, useEffect } from "react";
import { Newspaper, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
    id: number;
    headline: string;
    source: string;
    datetime: number;
    url: string;
    image?: string;
    summary?: string;
    category?: string;
}

export function MarketNewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchedAt, setFetchedAt] = useState<string>('');

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/market-news');
            const data = await res.json();

            if (data.success) {
                setNews(data.news || []);
                setFetchedAt(data.fetchedAt);
            }
        } catch (error) {
            console.error('[MarketNewsFeed] Failed to fetch news:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return diffMins < 1 ? '방금 전' : `${diffMins}분 전`;
        }
        if (diffHours < 24) return `${diffHours}시간 전`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    };

    return (
        <section className="glass-card col-span-3 md:col-span-1 p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2">
                    <Newspaper className="text-sky-400 h-5 w-5" />
                    Market News
                </h2>
                <button
                    onClick={fetchNews}
                    disabled={loading}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-lg hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    새로고침
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full mb-3" />
                    <p className="text-sm text-slate-400">뉴스 로딩 중...</p>
                </div>
            ) : news.length === 0 ? (
                <div className="text-center py-12">
                    <Newspaper className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">뉴스를 불러올 수 없습니다</p>
                </div>
            ) : (
                <>
                    {fetchedAt && (
                        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            업데이트: {new Date(fetchedAt).toLocaleString('ko-KR')}
                        </div>
                    )}

                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {news.map((item) => (
                            <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-lg p-4 hover:border-sky-500/30 hover:bg-slate-800/70 transition-all group"
                            >
                                {/* Headline */}
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                                            {item.headline}
                                        </h3>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-sky-400 flex-shrink-0 mt-0.5" />
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="font-medium text-sky-400">{item.source}</span>
                                    <span>•</span>
                                    <span>{formatDate(item.datetime)}</span>
                                </div>

                                {/* Summary (if available) */}
                                {item.summary && (
                                    <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                                        {item.summary}
                                    </p>
                                )}
                            </a>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
