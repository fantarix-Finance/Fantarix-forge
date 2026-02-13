"use client";

import { useChat } from "ai/react";
import { MessageCircle, X, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, input, handleInputChange, handleSubmit } = useChat();

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="glass-card w-80 h-96 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/5">
                        <span className="text-sm font-semibold text-sky-400">AI 마켓 어드바이저</span>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <p className="text-xs text-slate-500 text-center mt-10">
                                시장 심리, 특정 주식 전망, 경제 지표에 대해 물어보세요.<br />
                                "오늘 시장 분위기 어때?", "반도체 섹터 전망은?"
                            </p>
                        )}
                        {messages.map(m => (
                            <div key={m.id} className={cn(
                                "text-sm p-3 rounded-xl max-w-[85%]",
                                m.role === 'user'
                                    ? "bg-sky-600/50 text-white self-end ml-auto"
                                    : "bg-slate-700/50 text-slate-100 self-start"
                            )}>
                                {m.content}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 flex gap-2">
                        <input
                            className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="질문을 입력하세요..."
                        />
                        <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-white p-2 rounded-lg transition-colors">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-12 w-12 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
            >
                <MessageCircle className="h-6 w-6" />
            </button>
        </div>
    );
}
