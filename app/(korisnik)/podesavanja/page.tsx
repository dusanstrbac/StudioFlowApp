'use client';
import BetaOverlay from "@/components/BetaOverlay";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { deleteCookie, getCookie } from "cookies-next";
import { AnimatePresence, motion } from "framer-motion";
import { BellIcon, BuildingIcon, ChevronRight, PaletteIcon, PhoneCall, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

// Interfejsi za stabilniji rad
interface RadnoVremeDan {
    danUNedelji: number;
    od: string;
    do: string;
    isNeradniDan: boolean;
}

interface LokacijaDTO {
    id: number;
    nazivLokacije: string;
    adresa?: string;
    telefon?: string;
    email?: string;
}

// Interfejsi za API odgovore
interface FirmaResponse {
    naziv: string;
    lokacije: LokacijaDTO[];
}

interface RadnoVremeResponse {
    danUNedelji: number;
    vremeOd: string;
    vremeDo: string;
    isNeradniDan: boolean;
}

export default function PodesavanjaPage() {
    const router = useRouter();
    const korisnik = dajKorisnikaIzTokena();

    const [aktivnaSekcija, setAktivnaSekcija] = useState("Notifikacije");
    const [sveFirme, setSveFirme] = useState<LokacijaDTO[]>([]); 
    const [selektovanaFirmaId, setSelektovanaFirmaId] = useState<number | null>(null);
    const [nazivFirme, setNazivFirme] = useState("");
    
    // Auth & Security stanja
    const [staraLozinka, setStaraLozinka] = useState("");
    const [novaLozinka, setNovaLozinka] = useState("");
    const [potvrdaLozinka, setPotvrdaLozinka] = useState("");
    const [is2FAAktivan, setIs2FAAktivan] = useState(false);

    // Notifikacije stanja
    const [emailAktivan, setEmailAktivan] = useState(false);
    const [smsAktivan, setSmsAktivan] = useState(false);
    const [obavestenja, setObavestenja] = useState([
        { id: "novoZakazivanje", naziv: "Novo zakazivanje", opis: "Obaveštenje kada se zakaže nova usluga.", status: true },
        { id: "promenaSmene", naziv: "Promena smene", opis: "Obaveštenje o promenama u radnoj smeni.", status: false },
        { id: "promenaRadnogVremena", naziv: "Promena radnog vremena", opis: "Obaveštenje kada se promeni radno vreme lokala.", status: true },
        { id: "slanjeLogova", naziv: "Slanje informacija", opis: "Obaveštenje kada se promeni neka vasa informacija na profilu.", status: true }
    ]);

    // Podrska stanja
    const [opisProblema, setOpisProblema] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Radno vreme stanje
    const [radnoVreme, setRadnoVreme] = useState<RadnoVremeDan[]>(
        Array(7).fill(null).map((_, i) => ({ danUNedelji: i, od: "09:00", do: "17:00", isNeradniDan: false }))
    );

    const emailTehnickePodrske = "dusan.strbac01@gmail.com";
    const telefonTehnickePodrske = "+381607292777";

    const sekcije = [
        { naziv: "Notifikacije", opis: "Obaveštenja", ikonica: <BellIcon size={18} />},
        { naziv: "Sigurnost", opis: "Lozinka i 2FA" ,ikonica: <Shield size={18} />},
        { naziv: "Tema / Izgled", opis: "Tema i izgled" ,ikonica: <PaletteIcon size={18} />},
        { naziv: "Lokal", opis: "Podešavanje lokala" ,ikonica: <BuildingIcon size={18} />},
        { naziv: "Pomoć i podrška", opis: "Pomoć i podrška" ,ikonica: <PhoneCall size={18} />}
    ];

    // --- API POZIVI ---

    const fetchFirme = useCallback(async () => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data: FirmaResponse[] = await res.json();
            setNazivFirme(data[0]?.naziv || "Nepoznata firma");
            const sveLokacije: LokacijaDTO[] = data.flatMap((f) => f.lokacije);
            setSveFirme(sveLokacije);
            if (sveLokacije.length > 0 && !selektovanaFirmaId) {
                setSelektovanaFirmaId(sveLokacije[0].id);
            }
        } catch (error) {
            console.error('Greška pri dohvatanju firmi:', error);
        }
    }, [selektovanaFirmaId]);

    const ucitajRadnoVreme = useCallback(async (id: number) => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajRadnoVreme/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data: RadnoVremeResponse[] = await res.json();
                if (!data || data.length === 0) {
                    setRadnoVreme(Array(7).fill(null).map((_, i) => ({
                        danUNedelji: i, od: "09:00", do: "17:00", isNeradniDan: false
                    })));
                } else {
                    const mapirano: RadnoVremeDan[] = data.map((d) => ({
                        danUNedelji: d.danUNedelji,
                        od: d.vremeOd || "09:00",
                        do: d.vremeDo || "17:00",
                        isNeradniDan: d.isNeradniDan
                    }));
                    setRadnoVreme(mapirano);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Greška pri učitavanju radnog vremena.");
        }
    }, []);

    useEffect(() => { fetchFirme(); }, [fetchFirme]);
    
    useEffect(() => {
        if (selektovanaFirmaId) ucitajRadnoVreme(selektovanaFirmaId);
    }, [selektovanaFirmaId, ucitajRadnoVreme]);

    // --- HANDLERI ---

    const toggleObavestenje = (id: string) => {
        setObavestenja(prev => prev.map(o => o.id === id ? {...o, status: !o.status} : o));
    };

    const handleVremeChange = (index: number, polje: keyof RadnoVremeDan, vrednost: string | boolean) => {
        setRadnoVreme(prev => {
            const noviNiz = [...prev];
            const updatedItem = { ...noviNiz[index], [polje]: vrednost };
            noviNiz[index] = updatedItem as RadnoVremeDan;
            return noviNiz;
        });
    };

    const sacuvajRadnoVreme = async (lokacijaId: number, radnoVremeNiz: RadnoVremeDan[]) => {
        const token = getCookie("AuthToken");
        const body = {
            lokacijaId: lokacijaId,
            standardnoRadnoVreme: radnoVremeNiz.map((dan) => ({
                danUNedelji: dan.danUNedelji,
                vremeOd: dan.od,
                vremeDo: dan.do,
                isNeradniDan: dan.isNeradniDan
            }))
        };
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/AzurirajRadnoVreme`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success("Radno vreme je uspešno sačuvano!");
            } else {
                const errorData = await res.text();
                toast.error("Greška: " + errorData);
            }
        } catch (err) {
            console.error(err);
            toast.error("Greška prilikom povezivanja sa serverom.");
        }
    };

    const promeniLozinku = async () => {
        if (novaLozinka !== potvrdaLozinka) {
            toast.error('Lozinke se ne poklapaju');
            return;
        }
        if (novaLozinka.length < 6) {
            toast.info('Nova lozinka mora imati najmanje 6 karaktera');
            return;
        }
        const token = getCookie("AuthToken");
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Korisnik/PromeniLozinku`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ 
                    korisnickoIme: korisnik?.korisnickoIme, 
                    staraLozinka, 
                    novaLozinka, 
                    potvrdaNoveLozinke: potvrdaLozinka 
                })
            });
            if (res.ok) {
                toast.success("Uspešno ste promenili lozinku!");
                deleteCookie("AuthToken");
                router.push('/login');
            } else {
                toast.error("Greška prilikom promene lozinke.");
            }
        } catch {
            toast.error("Greška na serveru.");
        }
    };

    const prijaviProblemPoruku = async () => {
        if (!opisProblema.trim()) {
            toast.error("Unesite opis problema.");
            return;
        }
        setIsSending(true);
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Sistem/prijavi-gresku`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    imePrezime: korisnik?.ime,
                    korisnikEmail: korisnik?.email || "Nepoznat",
                    poruka: opisProblema
                })
            });
            if (res.ok) {
                toast.success("Greška prijavljena.");
                setOpisProblema("");
            } else {
                toast.error("Greška pri slanju.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Greška na serveru.");
        } finally {
            setIsSending(false);
        }
    };

    const trenutnaFirma = useMemo(() => sveFirme.find(f => f.id === selektovanaFirmaId) || null, [sveFirme, selektovanaFirmaId]);

    const sekcijaOpis = useMemo(() => {
        switch (aktivnaSekcija) {
            case "Notifikacije": return "Podesite kako i koja obaveštenja želite da dobijate.";
            case "Sigurnost": return "Promeni lozinku, aktiviraj 2FA i druge bezbednosne postavke.";
            case "Tema / Izgled": return "Podešavanje stila vaše aplikacije";
            case "Lokal": return "Informacije o lokalu i mogućnost promene podataka.";
            case "Pomoć i podrška": return "Linkovi i kontakti korisničke podrške, prijavljivanje greške";
            default: return "";
        }
    }, [aktivnaSekcija]);

const renderSadrzaj = () => {
        switch (aktivnaSekcija) {
            case "Notifikacije":
                return (
                    <div className="space-y-6">
                        <BetaOverlay isBlocked={true}>
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                    <h3 className="font-bold text-gray-900">Kanali obaveštavanja</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-800">Email obaveštenja</p>
                                            <p className="text-sm text-gray-500 italic">Primaćete izveštaje na {korisnik?.email}</p>
                                        </div>
                                        <button 
                                            onClick={() => setEmailAktivan(!emailAktivan)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${emailAktivan ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white shadow-md shadow-blue-100'}`}
                                        >
                                            {emailAktivan ? 'Onemogući' : 'Omogući'}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between border-t pt-6">
                                        <div>
                                            <p className="font-semibold text-gray-800">SMS obaveštenja</p>
                                            <p className="text-sm text-gray-500 italic">Direktne poruke za hitne termine</p>
                                        </div>
                                        <button 
                                            onClick={() => setSmsAktivan(!smsAktivan)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${smsAktivan ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white shadow-md shadow-blue-100'}`}
                                        >
                                            {smsAktivan ? 'Onemogući' : 'Omogući'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                    <h3 className="font-bold text-gray-900">Događaji</h3>
                                </div>
                                <div className="p-6 space-y-1">
                                    {obavestenja.map((o) => (
                                        <div key={o.id} className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition-colors group">
                                            <div className="pr-4">
                                                <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{o.naziv}</p>
                                                <p className="text-xs text-gray-500">{o.opis}</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={o.status} 
                                                onChange={() => toggleObavestenje(o.id)}
                                                className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </BetaOverlay>
                    </div>
                );
            case "Sigurnost":
                return (
                    <div className="max-w-2xl space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-gray-900 mb-4">Promena lozinke</h3>
                            <div className="space-y-3">
                                <input type="password" placeholder="Trenutna lozinka" value={staraLozinka} onChange={(e) => setStaraLozinka(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 ring-blue-100 outline-none transition-all" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input type="password" placeholder="Nova lozinka" value={novaLozinka} onChange={(e) => setNovaLozinka(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 ring-blue-100 outline-none transition-all" />
                                    <input type="password" placeholder="Potvrdi novu lozinku" value={potvrdaLozinka} onChange={(e) => setPotvrdaLozinka(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 ring-blue-100 outline-none transition-all" />
                                </div>
                            </div>
                            <button onClick={promeniLozinku} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-gray-200">
                                Ažuriraj lozinku
                            </button>
                        </div>

                        <BetaOverlay isBlocked={true}>
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-blue-900">Dvofaktorska autentifikacija (2FA)</p>
                                    <p className="text-sm text-blue-700/70">Dodajte dodatni nivo sigurnosti vašem nalogu.</p>
                                </div>
                                <button onClick={() => setIs2FAAktivan(!is2FAAktivan)} className={`px-5 py-2 rounded-xl text-sm font-bold ${is2FAAktivan ? 'bg-white text-red-600 border border-red-100' : 'bg-blue-600 text-white'}`}>
                                    {is2FAAktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                                </button>
                            </div>
                        </BetaOverlay>
                    </div>
                );
            case "Lokal":
                return (
                    <div className="space-y-6">
                         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <BuildingIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Trenutna lokacija</p>
                                    <p className="font-bold text-gray-900">{trenutnaFirma?.nazivLokacije}</p>
                                </div>
                            </div>
                            <select 
                                value={selektovanaFirmaId ?? ""} 
                                onChange={(e) => setSelektovanaFirmaId(Number(e.target.value))}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 ring-blue-50"
                            >
                                {sveFirme.map((f) => <option key={f.id} value={f.id}>{f.nazivLokacije}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                            <div className="xl:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900 border-b pb-4 mb-4">Informacije o lokalu</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Brend / Firma</p>
                                            <p className="font-medium">{nazivFirme}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Adresa</p>
                                            <p className="font-medium">{trenutnaFirma?.adresa || 'Nije uneta'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Kontakt telefon</p>
                                            <p className="font-medium text-blue-600 underline cursor-pointer">{trenutnaFirma?.telefon || 'Nije unet'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 border-b pb-4 mb-6">Podešavanje radnog vremena</h3>
                                <div className="space-y-2">
                                    {radnoVreme.map((dan, index) => (
                                        <div key={index} className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl transition-all ${dan.isNeradniDan ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-blue-50/30'}`}>
                                            <span className="w-20 font-bold text-gray-700">{["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"][index]}</span>
                                            
                                            <div className="flex items-center gap-2">
                                                <input type="time" value={dan.od} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "od", e.target.value)} className="bg-transparent border-none font-semibold text-gray-900 focus:ring-0 cursor-pointer" />
                                                <span className="text-gray-300">—</span>
                                                <input type="time" value={dan.do} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "do", e.target.value)} className="bg-transparent border-none font-semibold text-gray-900 focus:ring-0 cursor-pointer" />
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "isNeradniDan", e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Zatvoreno</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => selektovanaFirmaId && sacuvajRadnoVreme(selektovanaFirmaId, radnoVreme)} className="mt-8 w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                    Sačuvaj izmene vremena
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case "Pomoć i podrška":
                return (
                    <div className="max-w-3xl space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Tehnička podrška</p>
                                <p className="font-bold text-gray-900">{emailTehnickePodrske}</p>
                                <p className="text-sm text-blue-600 font-medium mt-1">{telefonTehnickePodrske}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900">Uputstvo</p>
                                    <p className="text-sm text-gray-500 italic underline cursor-pointer">Pogledaj video tutorijal</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-full text-gray-400">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Prijavi problem ili predloži novu funkciju</h3>
                            <textarea rows={5} value={opisProblema} onChange={(e) => setOpisProblema(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl focus:ring-2 ring-blue-50 outline-none transition-all resize-none" placeholder="Opišite detaljno šta ne funkcioniše..." />
                            <button 
                                onClick={prijaviProblemPoruku} 
                                disabled={isSending} 
                                className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                            >
                                {isSending ? "Slanje izveštaja..." : "Pošalji poruku"}
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigacija */}
                <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="mb-6 lg:mb-8 px-2">
                        <h2 className="text-2xl font-bold text-gray-900">Podešavanja</h2>
                        <p className="text-sm text-gray-500">Upravljajte nalogom i lokalom</p>
                    </div>

                    {/* Desktop/Tablet Sidebar */}
                    <div className="hidden lg:block space-y-1">
                        {sekcije.map((s) => (
                            <button
                                key={s.naziv}
                                onClick={() => setAktivnaSekcija(s.naziv)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${
                                    aktivnaSekcija === s.naziv 
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                                    : "text-gray-600 hover:bg-white hover:shadow-sm"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={aktivnaSekcija === s.naziv ? "text-white" : "text-gray-400 group-hover:text-blue-500"}>
                                        {s.ikonica}
                                    </span>
                                    <div className="text-left">
                                        <p className="font-bold text-sm leading-tight">{s.naziv}</p>
                                        <p className={`text-[10px] uppercase tracking-tighter ${aktivnaSekcija === s.naziv ? "text-blue-100" : "text-gray-400"}`}>
                                            {s.opis}
                                        </p>
                                    </div>
                                </div>
                                {aktivnaSekcija !== s.naziv && <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        ))}
                    </div>

                    {/* Mobilna Navigacija (Horizontalni Scroll) */}
                    <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-2 pb-2">
                        {sekcije.map((s) => (
                            <button
                                key={s.naziv}
                                onClick={() => setAktivnaSekcija(s.naziv)}
                                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                                    aktivnaSekcija === s.naziv ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-500 border border-gray-100"
                                }`}
                            >
                                {s.ikonica} {s.naziv}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={aktivnaSekcija}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="mb-6">
                                <h1 className="text-xl font-bold text-gray-900 lg:hidden mb-1">{aktivnaSekcija}</h1>
                                <p className="text-gray-500 text-sm italic">{sekcijaOpis}</p>
                            </div>
                            {renderSadrzaj()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}