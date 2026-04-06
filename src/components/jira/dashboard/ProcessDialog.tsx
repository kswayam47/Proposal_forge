"use client";

import { Loader2, Database, FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessDialogProps {
    isOpen: boolean;
    type: "sync" | "pdf";
    status: "processing" | "success" | "error";
    message?: string;
    onClose?: () => void;
}

export function ProcessDialog({ isOpen, type, status, message, onClose }: ProcessDialogProps) {
    if (!isOpen) return null;

    const config = {
        sync: {
            icon: Database,
            title: "JIRA Data Sync",
            processing: "Synchronizing latest issues and metrics...",
            success: "Sync complete! Data is now up-to-date.",
        },
        pdf: {
            icon: FileDown,
            title: "Generating Report",
            processing: "Crafting your high-fidelity PDF report...",
            success: "Report generated successfully!",
        },
    }[type];

    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" />

            {/* Dialog */}
            <div className="relative bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="p-10 flex flex-col items-center text-center">
                    {/* Animated Ring */}
                    <div className="relative mb-8">
                        <div className={cn(
                            "w-24 h-24 rounded-full border-4 flex items-center justify-center transition-colors duration-500",
                            status === "processing" ? "border-gray-100" :
                                status === "success" ? "border-emerald-100" :
                                    "border-red-100"
                        )}>
                            {status === "processing" ? (
                                <>
                                    <Loader2 className="absolute inset-0 w-24 h-24 text-blue-500 animate-spin stroke-[3px]" />
                                    <Icon className="w-10 h-10 text-gray-900" />
                                </>
                            ) : status === "success" ? (
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-in zoom-in-50 duration-300" />
                            ) : (
                                <AlertCircle className="w-12 h-12 text-red-500 animate-in zoom-in-50 duration-300" />
                            )}
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
                        {config.title}
                    </h3>

                    <p className={cn(
                        "text-sm font-medium leading-relaxed max-w-[240px]",
                        status === "error" ? "text-red-500" : "text-gray-500"
                    )}>
                        {message || (status === "processing" ? config.processing : config.success)}
                    </p>

                    {status !== "processing" && onClose && (
                        <button
                            onClick={onClose}
                            className="mt-8 w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Continue to Dashboard
                        </button>
                    )}
                </div>

                {/* Bottom Progress Bar (Pulse) */}
                {status === "processing" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-50 overflow-hidden">
                        <div className="h-full bg-blue-500 animate-[progress_1.5s_ease-in-out_infinite] w-1/3" />
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
        </div>
    );
}
