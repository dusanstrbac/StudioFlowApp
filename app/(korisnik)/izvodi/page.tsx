'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Download, Filter, Receipt, User, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { dajKorisnikaIzTokena } from '@/lib/auth';
import { getCookie } from 'cookies-next'; // Korišćenje konzistentnog načina za token
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StavkaIzvestaja {
  datum: string;
  opis: string;
  detalji: string;
  tip: 'PRIHOD' | 'TROSAK';
  iznos: number;
}

interface FinansijskiIzvestaj {
  nazivFirme: string;
  nazivLokacije: string;
  ukupnoPrihod: number;
  ukupnoTrosak: number;
  netoProfit: number;
  transakcije: StavkaIzvestaja[];
}

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

const Izvodi = () => {
  const korisnik = dajKorisnikaIzTokena();
  
  // STABILIZACIJA: Izvlačimo ID-jeve kao proste tipove podataka
  const idFirme = korisnik?.idFirme;
  const idLokacije = korisnik?.idLokacije;
  
  const [period, setPeriod] = useState<'dan' | 'mesec' | 'godina'>('mesec');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState<FinansijskiIzvestaj | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIzvestaj = useCallback(async () => {
    // Provera stabilnih ID-jeva zaustavlja beskonačni loop
    if (!idFirme || !idLokacije) return;
    
    setLoading(true);
    try {
      // Koristimo isti sistem tokena kao u Home.tsx
      const token = getCookie('AuthToken'); 
      const baseDate = selectedDate.toISOString().split('T')[0];
      
      // VAŽNO: Proveriti NEXT_PUBLIC_API_URL u .env na hostingu
      const url = `${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFinansijskiIzvestaj?idFirme=${idFirme}&idLokacije=${idLokacije}&period=${period}&baseDate=${baseDate}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Server vratio status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Greška pri dohvatanju izveštaja:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [idFirme, idLokacije, period, selectedDate]); 

  useEffect(() => {
    fetchIzvestaj();
  }, [fetchIzvestaj]);

  const shiftTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    const multiplier = direction === 'next' ? 1 : -1;

    if (period === 'dan') newDate.setDate(newDate.getDate() + multiplier);
    else if (period === 'mesec') newDate.setMonth(newDate.getMonth() + multiplier);
    else if (period === 'godina') newDate.setFullYear(newDate.getFullYear() + multiplier);

    setSelectedDate(newDate);
  };

  const exportToPDF = () => {
    if (!data || !data.nazivFirme) {
      alert("Podaci još uvek nisu učitani. Molimo sačekajte.");
      return;
    }

    const doc = new jsPDF();    
    const dateStr = selectedDate.toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' });
    
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(data.nazivFirme.toUpperCase(), 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Lokacija: ${data.nazivLokacije}`, 14, 28);
    doc.text(`Izveštaj za period: ${period.toUpperCase()} (${dateStr})`, 14, 34);
    
    doc.setDrawColor(230);
    doc.line(14, 38, 196, 38);

    autoTable(doc, {
      startY: 45,
      head: [['Ukupno Prihod', 'Ukupno Trosak', 'Neto Profit']],
      body: [[
        `${data.ukupnoPrihod.toLocaleString()} RSD`,
        `${data.ukupnoTrosak.toLocaleString()} RSD`,
        `${data.netoProfit.toLocaleString()} RSD`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const tableData = data.transakcije.map(t => [
      new Date(t.datum).toLocaleDateString('sr-Latn-RS'),
      t.opis,
      t.detalji,
      t.tip,
      `${t.iznos.toLocaleString()} RSD`
    ]);

    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || 45;

    autoTable(doc, {
      startY: finalY + 15,
      head: [['Datum', 'Opis', 'Detalji', 'Tip', 'Iznos']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [75, 85, 99] },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (cellData) => {
        if (cellData.column.index === 3) {
          if (cellData.cell.raw === 'PRIHOD') cellData.cell.styles.textColor = [22, 163, 74];
          if (cellData.cell.raw === 'TROSAK') cellData.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

    doc.save(`Izvestaj_${period}_${dateStr.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SA FILTERIMA */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Finansijski Izvodi</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <p className="text-gray-500 text-sm font-medium">
               Pregled za: <span className="text-blue-600 font-bold uppercase italic">
                 {period === 'dan' && selectedDate.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                 {period === 'mesec' && selectedDate.toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' })}
                 {period === 'godina' && selectedDate.getFullYear()}
               </span>
             </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button type="button" onClick={() => shiftTime('prev')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 shadow-sm"><ChevronLeft size={18}/></button>
            <input 
                type={period === 'dan' ? "date" : period === 'mesec' ? "month" : "number"}
                value={period === 'godina' ? selectedDate.getFullYear() : (period === 'mesec' ? selectedDate.toISOString().substring(0, 7) : selectedDate.toISOString().substring(0, 10))}
                onChange={(e) => {
                    const d = new Date(e.target.value);
                    if(!isNaN(d.getTime())) setSelectedDate(d);
                }}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer px-2 text-center w-36"
            />
            <button type="button" onClick={() => shiftTime('next')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 shadow-sm"><ChevronRight size={18}/></button>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            {(['dan', 'mesec', 'godina'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === p 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Prihod" amount={data?.ukupnoPrihod || 0} type="prihod" loading={loading} />
        <StatCard title="Troškovi" amount={data?.ukupnoTrosak || 0} type="trosak" loading={loading} />
        <StatCard title="Neto Profit" amount={data?.netoProfit || 0} type="profit" loading={loading} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30 shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 italic">
            <Filter size={18} className="text-blue-600" />
            Detaljna lista transakcija
          </h3>
            <button 
                type="button"
                onClick={exportToPDF}
                disabled={!data || data.transakcije.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                <Download size={14} /> PDF Izveštaj
            </button>
        </div>

        <div className="overflow-y-auto flex-grow scroll-smooth custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="text-gray-400 text-[10px] uppercase font-black tracking-[0.2em] bg-gray-50/90 backdrop-blur-md">
                <th className="px-8 py-5 border-b border-gray-100">Datum</th>
                <th className="px-8 py-5 border-b border-gray-100">Usluga / Opis</th>
                <th className="px-8 py-5 border-b border-gray-100 text-right">Iznos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <span className="text-sm font-bold text-gray-400 animate-pulse">Učitavanje podataka...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.transakcije.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-24 text-center text-gray-400 italic font-medium">
                    Nema transakcija za odabrani period.
                  </td>
                </tr>
              ) : (
                data.transakcije.map((t, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={i} 
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${t.tip === 'PRIHOD' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {new Date(t.datum).getDate()}
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                          {new Date(t.datum).toLocaleDateString('sr-Latn-RS', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{t.opis}</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                          {t.tip === 'PRIHOD' ? <User size={12} className="text-green-500"/> : <Receipt size={12} className="text-red-500"/>}
                          {t.detalji}
                        </span>
                      </div>
                    </td>
                    <td className={`px-8 py-5 text-right font-black text-sm ${t.tip === 'PRIHOD' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.tip === 'PRIHOD' ? '+' : '-'}{t.iznos.toLocaleString()} RSD
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
};

interface StatCardProps {
  title: string;
  amount: number;
  type: 'prihod' | 'trosak' | 'profit';
  loading: boolean;
}

const StatCard = ({ title, amount, type, loading }: StatCardProps) => {
  const styles = {
    prihod: "bg-green-500 text-white shadow-green-100",
    trosak: "bg-red-500 text-white shadow-red-100",
    profit: "bg-blue-600 text-white shadow-blue-100"
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 cursor-default transition-all"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${styles[type]}`}>
        {type === 'prihod' && <TrendingUp size={24} />}
        {type === 'trosak' && <TrendingDown size={24} />}
        {type === 'profit' && <Wallet size={24} />}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] mb-0.5">{title}</p>
        <h2 className="text-lg font-black text-gray-800">
          {loading ? <div className="h-6 w-24 bg-gray-100 animate-pulse rounded" /> : `${amount.toLocaleString()} RSD`}
        </h2>
      </div>
    </motion.div>
  );
};

export default Izvodi;