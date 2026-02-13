"use client";

import dynamic from 'next/dynamic';

const MarketIndices = dynamic(() => import("./MarketIndices").then(mod => mod.MarketIndices), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-slate-800/50 h-64 rounded-xl"></div>
});

export function MarketIndicesWrapper() {
    return <MarketIndices />;
}
