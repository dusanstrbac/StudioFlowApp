'use client'
import { Korisnik } from "@/types/korisnik";
import { CalendarDays, LogOut, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCookie, deleteCookie } from "cookies-next";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { Termin } from "@/types/firma";

interface SledeciTermin {
  id: number;
  datum: string;
  ime: string;
  usluga: string | null;
}

export default function Nalog() {
  const router = useRouter();
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);
  const [ucinak, setUcinak] = useState({ trenutni: 0, cilj: 150 });
  const [sledeciTermin, setSledeciTermin] = useState<SledeciTermin | null>(null);
  const [activeTab, setActiveTab] = useState<'ucinak' | 'termini'>('ucinak');
  const [mojiTermini, setMojiTermini] = useState<Termin[]>([]);


  const formatirajDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString("sr-RS") + ' ' + new Date(datum).toLocaleTimeString("sr-RS", { hour: '2-digit', minute: '2-digit' });
  };

  // Ovo ide bez vremena, samo vraca datum
  const formatirajSamoDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString("sr-RS");
  };

  const odjaviKorisnika = () => {
    deleteCookie("AuthToken");
    router.push("/login");
    localStorage.removeItem('active_salon_id');
  };

  useEffect(() => {
    const fetchPodatke = async () => {
      try {
        const token = getCookie("AuthToken");
        if (!token || typeof token !== "string") return;

        const korisnikIzTokena = dajKorisnikaIzTokena(token);
        if (!korisnikIzTokena) return;

        setKorisnik({
          ime: korisnikIzTokena.ime,
          uloga: korisnikIzTokena.uloga,
          email: korisnikIzTokena.email,
          telefon: korisnikIzTokena.telefon,
          datumKreiranja: "",
          godisnjiOdmor: [],
        });

        // Fetch detalje korisnika
        const resKorisnik = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Korisnik/DajKorisnika?emailKorisnika=${korisnikIzTokena.email}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (resKorisnik.ok) {
          const data = await resKorisnik.json();
          setKorisnik(prev => ({ ...prev, ...data }));
        }

        // Fetch učinak
        const resUcinak = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajUcinakKorisnika?korisnikId=${korisnikIzTokena.idKorisnika}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (resUcinak.ok) {
          const ucinakData = await resUcinak.json();
          setUcinak({ trenutni: ucinakData.trenutniUcinak, cilj: ucinakData.cilj });
        }

        // Fetch sledeći termin
        const resTermin = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajSledeciTermin?korisnikId=${korisnikIzTokena.idKorisnika}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (resTermin.ok) {
          const data = await resTermin.json();
          setSledeciTermin(data);
        }

      } catch (error) {
        console.error("Greška pri učitavanju podataka:", error);
      }
    };

    fetchPodatke();
  }, []);

  useEffect(() => {
    const fetchTermine = async () => {
      try {
        const token = getCookie("AuthToken");
        if (!token || typeof token !== "string") return;

        const korisnik = dajKorisnikaIzTokena(token);
        if (!korisnik) return;

        const datum = new Date();
        const mesec = datum.getMonth() + 1; // JS meseci od 0
        const godina = datum.getFullYear();

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajZakazaneTermineZaMesec?idFirme=${korisnik.idFirme}&idLokacije=${korisnik.idLokacije}&mesec=${mesec}&godina=${godina}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Greška pri učitavanju termina");

        const data: Termin[] = await res.json();
        setMojiTermini(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTermine();
  }, []);

  const procenat = Math.min((ucinak.trenutni / ucinak.cilj) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-gray-200">
        <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm border border-sky-200">
          {korisnik?.ime?.split(' ').map(n => n[0]).join('') || 'U'}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900">{korisnik?.ime}</h1>
          <p className="text-gray-500 font-medium">{korisnik?.email}</p>
          <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
              {korisnik?.uloga}
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 uppercase tracking-wider">
              Aktivan nalog
            </span>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="max-w-5xl mx-auto mt-3 p-6">
        {/* PRVI RED: Kontakt + Sledeći termin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kontakt */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm font-bold text-gray-400 uppercase mb-3">Kontakt</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <PhoneIcon className="w-5 h-5 text-sky-500" />
                <span className="font-medium">Telefon: <span className="text-blue-500">{korisnik?.telefon || "Nema podataka"}</span></span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <CalendarDays className="w-5 h-5 text-sky-500" />
                <span className="font-medium text-sm">
                  Nalog kreiran: {korisnik?.datumKreiranja ? formatirajSamoDatum(korisnik.datumKreiranja) : "..."}
                </span>
              </div>
            </div>
          </div>

          {/* Sledeći termin */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm font-bold text-gray-400 uppercase mb-3">Sledeći termin</p>
            <div className="space-y-2">
              <p className="text-gray-800 font-semibold">Frizer: {korisnik?.ime}</p>
              <p className="text-gray-500 text-sm">Datum i vreme: {sledeciTermin ? formatirajDatum(sledeciTermin.datum) : '...'}</p>
              <p className="text-gray-500 text-sm">Musterija: {sledeciTermin?.ime}</p>
              <p className="text-gray-500 text-sm">Usluga: {sledeciTermin?.usluga}</p>
            </div>
          </div>
        </div>

        {/* Drugi red - Ucikan i moji termini */}
        <div className="mt-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          
          {/* Tabovi */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'ucinak' ? 'border-b-2 border-sky-500 text-gray-900' : 'text-gray-400'}`}
              onClick={() => setActiveTab('ucinak')}
            >
              Učinak
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'termini' ? 'border-b-2 border-sky-500 text-gray-900' : 'text-gray-400'}`}
              onClick={() => setActiveTab('termini')}
            >
              Moji termini
            </button>
          </div>

          {/* Sadržaj tabova */}
          {activeTab === 'ucinak' && (
            <div>
              <p className="text-3xl font-black text-gray-800">{ucinak.trenutni}</p>
              <p className="text-sm text-gray-500 font-medium">Odrađenih termina</p>
              <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${procenat}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">
                Cilj: {ucinak.cilj} termina
              </p>
            </div>
          )}

          {activeTab === 'termini' && (
            <div className="h-72 overflow-y-auto space-y-3 pr-2">
              {mojiTermini?.length > 0 ? (
                mojiTermini.map((termin, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-800">{termin.imeMusterije}</p>
                    <p className="text-gray-500 text-sm">{formatirajDatum(termin.datumTermina)}</p>
                    <p className="text-gray-500 text-sm">{termin.nazivUsluge || "Nema naziva usluge"}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">Nema zakazanih termina</p>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ODJAVA */}
      <button
        onClick={odjaviKorisnika}
        className="fixed bottom-8 right-8 bg-white text-gray-500 border border-gray-200 px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-2 cursor-pointer group text-sm"
      >
        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> 
        Odjavi se
      </button>
    </div>
  );
}
