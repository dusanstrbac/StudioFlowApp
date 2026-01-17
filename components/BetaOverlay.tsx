'use client';
import { ReactNode } from "react";
import { HammerIcon } from "lucide-react"; // Možeš koristiti bilo koju ikonu

interface BlockerProps {
    isBlocked: boolean; 
    children: ReactNode;
}

export default function BetaOverlay({ isBlocked, children }: BlockerProps) {
    const message = "Funkcija je u toku izrade";

    return (
        <div className="relative group">
            {/* Kontejner za decu - dodajemo blagi blur ako je blokirano */}
            <div className={`transition-all duration-300 ${isBlocked ? 'blur-[2px] select-none pointer-events-none' : ''}`}>
                {children}
            </div>

            {isBlocked && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl overflow-hidden">
                    {/* Poluprovidni sloj sa blur efektom */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
                    
                    {/* Kartica sa porukom */}
                    <div className="relative z-10 flex flex-col items-center p-6 text-center">
                        <div className="mb-3 p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl shadow-xl">
                            <HammerIcon className="text-white animate-bounce" size={24} />
                        </div>
                        
                        <p className="text-white font-bold text-lg tracking-tight">
                            {message}
                        </p>
                        <p className="text-blue-100/80 text-xs mt-1 font-medium uppercase tracking-widest">
                            Beta faza
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}