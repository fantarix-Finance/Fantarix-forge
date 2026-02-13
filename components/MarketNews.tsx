import { ExternalLink, Newspaper } from "lucide-react";

export function MarketNews() {
    const sources = [
        { name: 'CNBC', url: 'https://www.cnbc.com/world/?region=world' },
        { name: 'Investing', url: 'https://kr.investing.com/' },
        { name: 'Bloomberg', url: 'https://www.bloomberg.com/asia' },
        { name: 'WSJ', url: 'https://www.wsj.com/' },
        { name: 'Fed (연준)', url: 'https://www.federalreserve.gov/' },
    ];

    return (
        <section className="glass-card col-span-3 p-6 mt-auto">
            <h2 className="text-lg font-semibold text-slate-400 flex items-center gap-2 mb-4">
                <Newspaper className="text-sky-400 h-5 w-5" /> 애널리스트 덱 (뉴스 & 리포트)
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {sources.map(src => (
                    <a
                        key={src.name}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[120px] glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 group no-underline"
                    >
                        <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-sky-400 transition-colors" />
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{src.name}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
