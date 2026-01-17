"use client";
import Kalendar from "@/components/ui/Kalendar";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { FirmaAsortimanDTO } from "@/types/firma";
import { getCookie } from "cookies-next";
import { useEffect, useState, useCallback } from "react";

// Definišemo interfejs za termine
interface TerminDTO {
  datumTermina: string;
  imeMusterije: string;
  nazivUsluge: string;
  cena: number;
}

export default function Home() {
  const korisnik = dajKorisnikaIzTokena();
  const idFirme = korisnik?.idFirme;

  // State za praćenje aktivnog lokala koji se može menjati kroz navigaciju
  const [trenutniIdLokacije, setTrenutniIdLokacije] = useState<string | null>(null);

  const [asortiman, setAsortiman] = useState<FirmaAsortimanDTO[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dnevniTermini, setDnevniTermini] = useState<TerminDTO[]>([]);
  const [loadingTermini, setLoadingTermini] = useState(false);
  const [mesecniTermini, setMesecniTermini] = useState<TerminDTO[]>([]);

  // 1. INICIJALIZACIJA: Čitamo početni ID iz localStorage ili iz tokena
  useEffect(() => {
    const sacuvanId = localStorage.getItem('active_salon_id');
    if (sacuvanId) {
      setTrenutniIdLokacije(sacuvanId);
    } else if (korisnik?.idLokacije) {
      const defaultId = String(korisnik.idLokacije);
      setTrenutniIdLokacije(defaultId);
      localStorage.setItem('active_salon_id', defaultId);
    }
  }, [korisnik?.idLokacije]);


  // 2. FETCH FUNKCIJE: Koriste 'trenutniIdLokacije' iz state-a
  const fetchDnevneTermine = useCallback(async (date: Date) => {
    if (!idFirme || !trenutniIdLokacije) return;
    
    setLoadingTermini(true);
    const sqlDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    try {
      const token = getCookie("AuthToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajZakazaneTermine?idFirme=${idFirme}&idLokacije=${trenutniIdLokacije}&datumZakazivanja=${sqlDate}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data: TerminDTO[] = await res.json();
        setDnevniTermini(data);
      }
    } catch (err) {
      console.error("Greška pri osvežavanju dnevnih termina:", err);
    } finally {
      setLoadingTermini(false);
    }
  }, [idFirme, trenutniIdLokacije]);

  const fetchMesecniTermini = useCallback(async (godina: number, mesec: number) => {
    if (!idFirme || !trenutniIdLokacije) return;
    try {
        const token = getCookie("AuthToken");
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajZakazaneTermineZaMesec?idFirme=${idFirme}&idLokacije=${trenutniIdLokacije}&mesec=${mesec + 1}&godina=${godina}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (res.ok) {
            const data = await res.json();
            setMesecniTermini(data);
        }
    } catch (err) {
        console.error("Greška pri osvežavanju mesečnih termina:", err);
    }
  }, [idFirme, trenutniIdLokacije]);

  // 3. EVENT LISTENERS: Slušamo navigaciju i globalne promene
  useEffect(() => {
    const osveziLokal = () => {
      const noviId = localStorage.getItem('active_salon_id');
      if (noviId && noviId !== trenutniIdLokacije) {
        console.log("Menjam lokal na:", noviId);
        setTrenutniIdLokacije(noviId);
      }
    };

    const osveziSve = () => {
      fetchDnevneTermine(selectedDate);
      fetchMesecniTermini(selectedDate.getFullYear(), selectedDate.getMonth());
    };

    window.addEventListener("salon_changed", osveziLokal);
    window.addEventListener("terminZakazanGlobalno", osveziSve);

    return () => {
      window.removeEventListener("salon_changed", osveziLokal);
      window.removeEventListener("terminZakazanGlobalno", osveziSve);
    };
  }, [trenutniIdLokacije, selectedDate, fetchDnevneTermine, fetchMesecniTermini]);

  // 4. AUTOMATSKO OSVEŽAVANJE: Reaguje na promenu datuma ILI lokacije
  useEffect(() => {
    if (trenutniIdLokacije) {
      fetchDnevneTermine(selectedDate);
      fetchMesecniTermini(selectedDate.getFullYear(), selectedDate.getMonth());
    }
  }, [selectedDate, trenutniIdLokacije, fetchDnevneTermine, fetchMesecniTermini]);

  // Fetch asortimana (zavisi samo od firme)
  useEffect(() => {
    const fetchAsortiman = async () => {
      if (!idFirme) return;
      try {
        const token = getCookie("AuthToken");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajAsortiman?idFirme=${idFirme}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAsortiman(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAsortiman();
  }, [idFirme]);

  return (
    <div className="w-full">
      {/* Kalendar sekcija */}
      <div className="mb-6">
        <Kalendar 
          asortiman={asortiman}
          idLokacije={Number(trenutniIdLokacije)}
          mesecniTermini={mesecniTermini}
          onDateSelect={(date) => setSelectedDate(date)}
          onTerminZakazan={() => {
            fetchDnevneTermine(selectedDate);
            fetchMesecniTermini(selectedDate.getFullYear(), selectedDate.getMonth());
          }}          
          onMonthChange={(year, month) => fetchMesecniTermini(year, month)}
        />
      </div>

      {/* Lista termina za odabrani dan */}
      <div className="bg-white border-t border-gray-200">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Raspored termina</h3>
              <p className="text-sm text-gray-500 font-medium">
                {selectedDate.toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase">
              {dnevniTermini.length} zakazano
            </div>
          </div>

          {loadingTermini ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dnevniTermini.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dnevniTermini.map((termin, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 group cursor-default"
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-blue-100 shadow-lg">
                    <span className="text-sm font-bold leading-none">
                      {new Date(termin.datumTermina).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {termin.imeMusterije}
                    </p>
                    <p className="text-xs font-medium text-gray-500 truncate italic">
                      {termin.nazivUsluge}
                    </p>
                    <p className="text-xs font-bold text-green-600 mt-1">
                      {termin.cena} RSD
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="mx-auto w-12 h-12 text-gray-300 mb-3">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nema zakazanih termina za ovaj dan.</p>
              <p className="text-xs text-gray-400 mt-1">Kliknite dva puta na dan u kalendaru da zakažete novi termin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}