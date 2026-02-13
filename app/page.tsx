import { MarketIndices } from "@/components/MarketIndices";
import { Portfolio } from "@/components/Portfolio";
import { MarketNewsFeed } from "@/components/MarketNewsFeed";
import { ChatWidget } from "@/components/ChatWidget";
import { RiskMonitor } from "@/components/RiskMonitor";
import { OpportunityRadar } from "@/components/OpportunityRadar";
import { FearGreedIndex } from "@/components/FearGreedIndex";

export default function Home() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <main className="min-h-screen p-8 flex justify-center pb-20">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Market<span className="text-sky-400">Pulse</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">{currentDate}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse box-shadow-green"></span>
            라이브 마켓
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MarketIndices />
          <Portfolio />
          <RiskMonitor />
          <OpportunityRadar />

          <FearGreedIndex />

          <MarketNewsFeed />
        </div>

        <ChatWidget />
      </div>
    </main>
  );
}
