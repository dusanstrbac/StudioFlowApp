'use client';
import { useState, useEffect } from "react";
import { getCookie } from "cookies-next";
import { Calendar, Clock } from "lucide-react";
import BrzaRezervacijaModal from "./BrzaRezervacijaModal"; // <--- UVOZ

interface RadnoVreme {
  danUNedelji: number;
  vremeOd: string;
  vremeDo: string;
  isNeradniDan: boolean;
}

const TopNavigation = () => {
  const [radnoVreme, setRadnoVreme] = useState<RadnoVreme[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);

  const getApiDayIndex = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  useEffect(() => {
    setMounted(true);
    setToday(new Date());

    const fetchWorkingHours = async () => {
      try {
        const token = getCookie("AuthToken");
        const lokacijaId = 1; 
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajRadnoVreme/${lokacijaId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setRadnoVreme(data);
        }
      } catch (error) {
        console.error('Failed to load working hours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkingHours();
    const interval = setInterval(() => setToday(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatus = () => {
    if (!today || !radnoVreme || radnoVreme.length === 0) return "Nepoznato";
    const apiDayIdx = getApiDayIndex(today.getDay());
    const danas = radnoVreme.find(d => d.danUNedelji === apiDayIdx);
    if (!danas || danas.isNeradniDan) return "Zatvoreno";
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const parseToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const start = parseToMinutes(danas.vremeOd);
    const end = parseToMinutes(danas.vremeDo);
    return (nowMinutes >= start && nowMinutes < end) ? "Otvoreno" : "Zatvoreno";
  };

  if (!mounted) return <div className="border-b border-gray-200 px-8 py-4 bg-white h-[65px]"></div>;

  const trenutniStatus = getStatus();
  const formattedDate = today ? today.toLocaleDateString('sr-Latn-RS', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : "";

  return (
    <>
      <div className="flex justify-between items-center border-b border-gray-200 px-8 py-4 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Status</h3>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                {loading ? (
                    <span className="text-[9px] text-gray-400 font-black uppercase animate-pulse">Checking...</span>
                ) : (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${trenutniStatus === "Otvoreno" ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${trenutniStatus === "Otvoreno" ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </span>
                        <span className={`font-black text-[10px] uppercase tracking-tighter ${trenutniStatus === "Otvoreno" ? 'text-green-700' : 'text-red-700'}`}>
                            {trenutniStatus}
                        </span>
                    </>
                )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsQuickBookingOpen(true)}
            className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 shadow-black/10"
          >
            <Calendar size={14} className="text-blue-400" />
            Brza rezervacija
          </button>
          
          <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
            <Clock size={14} className="text-gray-400" />
            <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-tighter">{formattedDate}</h3>
          </div>
        </div>
      </div>

      {/* POZIV EKSTERNE KOMPONENTE */}
      <BrzaRezervacijaModal 
        isOpen={isQuickBookingOpen} 
        onClose={() => setIsQuickBookingOpen(false)} 
      />
    </>
  );
};

export default TopNavigation;