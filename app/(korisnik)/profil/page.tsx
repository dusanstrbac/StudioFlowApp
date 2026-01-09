'use client'
import { Korisnik } from "@/types/korisnik";
import { ArrowUpDown, CalendarDays, ClipboardList, FileText, GraduationCap, LogOut, PhoneIcon, TreePalm } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCookie, deleteCookie } from "cookies-next";
import { dajKorisnikaIzTokena, KorisnikToken } from "@/lib/auth";

export default function Nalog() {
  const router = useRouter();
  const [korisnik, setKorisnik] = useState<Korisnik | null>(null);

  const formatirajDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString("sr-RS");
  };

  useEffect(() => {
    const fetchKorisnik = async () => {
      try {
        // 1️⃣ Dobij token iz cookie-ja
        const token = getCookie("AuthToken");
        if (!token || typeof token !== "string") {
          console.log("Nema AuthToken cookie-a");
          return;
        }

        // 2️⃣ Dekodiraj token
        const korisnikIzTokena: KorisnikToken | null = dajKorisnikaIzTokena(token);
        if (!korisnikIzTokena) return;

        // 3️⃣ Postavi osnovne podatke iz tokena odmah
        setKorisnik({
          ime: korisnikIzTokena.ime,
          uloga: korisnikIzTokena.uloga,
          email: korisnikIzTokena.email,
          telefon: korisnikIzTokena.telefon,
          datumKreiranja: "", 
          godisnjiOdmor: [],
        });

        // 4️⃣ Fetch dodatnih podataka sa servera
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Korisnik/DajKorisnika?emailKorisnika=${korisnikIzTokena.email}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Greška prilikom učitavanja korisnika");

        const data = await res.json();
        setKorisnik(prev => ({ ...prev, ...data })); // Spoji server data sa tokenom
      } catch (error) {
        console.error("Greška pri dohvatanju korisnika:", error);
      }
    };

    fetchKorisnik();
  }, []);

  const odjaviKorisnika = () => {
    deleteCookie("AuthToken");
    router.push("/login");
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6">
      {/* HEADER SEKCIJA - Inicijali i Ime */}
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

      {/* DASHBOARD GRID - Ključne informacije */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        
        {/* Kartica 1: Kontakt */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase mb-3">Kontakt</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <PhoneIcon className="w-5 h-5 text-sky-500" />
              <span className="font-medium">{korisnik?.telefon || "Nema podataka"}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <CalendarDays className="w-5 h-5 text-sky-500" />
              <span className="font-medium text-sm">
                Od: {korisnik?.datumKreiranja ? formatirajDatum(korisnik.datumKreiranja) : "..."}
              </span>
            </div>
          </div>
        </div>

        {/* Kartica 2: Status i Odmor */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase mb-3">Godišnji odmor</p>
          <div className="flex items-center justify-between">
            <div>
                <p className="text-2xl font-bold text-gray-800">
                  {korisnik?.godisnjiOdmor?.[0]?.preostaloDana ?? 0} <span className="text-sm font-normal text-gray-500">/ {korisnik?.godisnjiOdmor?.[0]?.ukupnoDana ?? 0}</span>
                </p>
                <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-1">
                  <TreePalm className="w-3 h-3"/> Preostalo dana
                </p>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                <ArrowUpDown className="text-gray-400 w-6 h-6"/>
            </div>
          </div>
        </div>

        {/* Kartica 3: Specijalizacija */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase mb-3">Ekspertiza</p>
          <div className="font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap className="text-sky-600"/> Muški frizer
          </div>
          <p className="text-xs text-gray-400 mt-2 italic font-medium">Sertifikovana licenca A1</p>
        </div>

      </div>

      {/* DONJA SEKCIJA - Zadaci i Dokumentacija */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 bg-gray-50 p-8 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="text-sky-500" /> Radni zadaci
          </h2>
          <ul className="space-y-3">
            {['Izvršavanje usluga', 'Naručivanje robe za lokal', 'Čišćenje i sređivanje lokala'].map((zadatak, i) => (
              <li key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 text-gray-600 font-medium shadow-sm">
                <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
                {zadatak}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center items-center text-center p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="bg-sky-50 p-4 rounded-2xl mb-3">
            <ClipboardList className="w-8 h-8 text-sky-500" />
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Učinak (Ovaj mesec)</p>
          <p className="text-3xl font-black text-gray-800 mt-1">124</p>
          <p className="text-sm text-gray-500 font-medium">Odrađenih termina</p>
          <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full w-[75%] rounded-full"></div>
          </div>
        </div>
      </div>

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