"use client";

import { Upload, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { parsePortfolioCSV, savePortfolioToStorage, type AccountData } from "@/lib/portfolio-parser";
import { cn } from "@/lib/utils";

interface PortfolioUploaderProps {
    onUploadSuccess: (accounts: AccountData[]) => void;
}

export function PortfolioUploader({ onUploadSuccess }: PortfolioUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            setMessage({ type: 'error', text: 'CSV 파일만 업로드 가능합니다.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            // Read file
            const content = await file.text();

            // Parse CSV
            const result = parsePortfolioCSV(content);

            if (!result.success || !result.data) {
                setMessage({ type: 'error', text: result.error || '파싱 실패' });
                setUploading(false);
                return;
            }

            // Save to storage
            savePortfolioToStorage(result.data);

            // Notify parent
            onUploadSuccess(result.data);

            setMessage({
                type: 'success',
                text: `✅ ${result.data.length}개 계좌, ${result.data.reduce((sum, acc) => sum + acc.holdings.length, 0)}개 종목 업로드 완료`
            });

        } catch (error: any) {
            setMessage({ type: 'error', text: `오류 발생: ${error.message}` });
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownloadTemplate = () => {
        // Create CSV content with BOM for Excel compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + `계좌명,종목코드,종목명,수량,평균단가
개인연금계좌,458730.KS,Tiger 미국배당다우존스,4756,10589
개인연금계좌,489250.KS,Kodex 미국배당다우존스,1437,10394
퇴직연금계좌,453850.KS,ACE 미국30년국채액티브(H),5245,7965
퇴직연금계좌,458730.KS,Tiger 미국배당다우존스,260,11709
퇴직연금계좌,489250.KS,Kodex 미국배당다우존스,317,10648
퇴직연금계좌,472870.KS,Rise 미국30년국채엔화노출,64,9973
퇴직연금계좌,453650.KS,Kodex 미국S&P금융(A),201,18715
퇴직연금계좌,415920.KS,PLUS 글로벌희토류,316,9465
퇴직연금계좌,423160.KS,Kodex KOFR금리액티브,24,110875
IRP계좌,453850.KS,ACE 미국30년국채액티브(H),665,8355
IRP계좌,458730.KS,Tiger 미국배당다우존스,767,13345
IRP계좌,472870.KS,Rise 미국30년국채엔화노출,31,9065
IRP계좌,489250.KS,Kodex 미국배당다우존스,279,11179`;

        // Create blob with UTF-8 encoding
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = 'portfolio-template.csv';

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-gradient-to-br from-purple-500/10 via-sky-500/10 to-pink-500/10 border border-white/10 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Upload className="h-4 w-4 text-sky-400" />
                    포트폴리오 업로드
                </h3>
                <button
                    onClick={handleDownloadTemplate}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                    <Download className="h-3 w-3" />
                    템플릿 다운로드
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="portfolio-upload"
            />

            <label
                htmlFor="portfolio-upload"
                className={cn(
                    "block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                    uploading
                        ? "border-slate-600 bg-slate-800/50"
                        : "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50 hover:bg-sky-500/10"
                )}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full" />
                        <span className="text-xs text-slate-400">파일 처리 중...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-5 w-5 text-sky-400" />
                        <span className="text-xs text-slate-300">
                            CSV 파일을 선택하거나 여기에 드래그하세요
                        </span>
                        <span className="text-[10px] text-slate-500">
                            형식: 계좌명, 종목코드, 종목명, 수량, 평균단가
                        </span>
                    </div>
                )}
            </label>

            {message && (
                <div className={cn(
                    "mt-3 p-3 rounded-lg flex items-start gap-2 text-xs",
                    message.type === 'success'
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                )}>
                    {message.type === 'success' ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">{message.text}</span>
                    <button
                        onClick={() => setMessage(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
