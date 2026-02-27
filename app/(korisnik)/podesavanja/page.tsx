'use client';
import BetaOverlay from "@/components/BetaOverlay";
import OnlineZakazivanjeModal from "@/components/ui/DesignReservationsModal";
import DesignReservationModal from "@/components/ui/DesignReservationsModal";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { korisnikJeVlasnik } from "@/lib/proveraUloge";
import { deleteCookie, getCookie } from "cookies-next";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BellIcon, BuildingIcon, ChevronDown, ChevronRight, PaletteIcon, PhoneCall, Shield } from "lucide-react";
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
    const korisnik = useMemo(() => dajKorisnikaIzTokena(), []);
    const isReadOnly = !korisnikJeVlasnik(korisnik);
    
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

    // Online zakazivanje
    const [statusOnlineZakazivanja, setStatusOnlineZakazivanja] = useState(false);
    const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

    // Podrska stanja
    const [opisProblema, setOpisProblema] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Radno vreme stanje
    const [radnoVreme, setRadnoVreme] = useState<RadnoVremeDan[]>(
        Array(7).fill(null).map((_, i) => ({ danUNedelji: i, od: "09:00", do: "17:00", isNeradniDan: false }))
    );

    const emailTehnickePodrske = "click.app001@gmail.com";
    const telefonTehnickePodrske = "+381606091110";

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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme?idFirme=${korisnik?.idFirme}`, {
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
            case "Notifikacije": return "Prilagodite obaveštenja svojim potrebama.";
            case "Sigurnost": return "Promenite lozinku, aktivirajte 2FA i druge bezbednosne postavke.";
            case "Tema / Izgled": return "Podešavanje stila vaše aplikacije.";
            case "Lokal": return "Informacije o lokalu i promena radnog vremena.";
            case "Pomoć i podrška": return "Linkovi i kontakti korisničke podrške.";
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
                                            {/* <p className="text-sm text-gray-500 italic">Primaćete izveštaje na {korisnik?.email}</p> */}
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
            case "Tema / Izgled":
                return (
                    <BetaOverlay isBlocked={true}>
                    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Sekcija: Primarna Boja */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                                </div>
                                <h3 className="font-bold text-gray-900">Primarna boja sistema</h3>
                            </div>
                                
                            <div className="grid grid-cols-4 gap-3">
                                {['#2563eb', '#7c3aed', '#db2777', '#059669'].map((color) => (
                                    <button 
                                        key={color}
                                        className="h-12 rounded-xl border-2 border-transparent hover:border-gray-200 transition-all flex items-center justify-center"
                                        style={{ backgroundColor: `${color}10` }}
                                    >
                                        <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 italic">* Ova podešavanja utiču na izgled vašeg korisničkog panela.</p>
                        </div>

                        {/* Sekcija: Dark Mode (Blokirano sa tvojim BetaOverlay-om) */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 rounded-xl">
                                    {/* Moon icon placeholder */}
                                    <div className="w-5 h-5 border-2 border-slate-400 rounded-full border-t-transparent -rotate-45"></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Tamni režim (Dark Mode)</h3>
                                    <p className="text-sm text-gray-500">Prebacite interfejs u tamne tonove radi lakšeg rada noću.</p>
                                </div>
                            </div>
                                    
                            {/* Fake Toggle Switch */}
                            <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>

                        {/* Sekcija: Kompaktan prikaz */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">Kompaktan prikaz tabela</h3>
                                <p className="text-sm text-gray-500">Smanjuje razmake u tabelama kako bi stalo više podataka.</p>
                            </div>
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
                            </button>
                        </div>
                    </div>
                    </BetaOverlay>
                );
            case "Lokal":
                if (isReadOnly) {
                    return (
                        <div className="py-20 text-center">
                            <p className="text-gray-400 italic">Nemate privilegije za izmenu podešavanja lokala.</p>
                        </div>
                    );
                }
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Top Bar: Selektor lokala */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <BuildingIcon size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Administracija objekta</p>
                                    <h2 className="text-xl font-bold text-gray-900">{trenutnaFirma?.nazivLokacije || "Izaberite lokal"}</h2>
                                </div>
                            </div>
                            
                            <div className="relative group">
                                <select 
                                    value={selektovanaFirmaId ?? ""} 
                                    onChange={(e) => setSelektovanaFirmaId(Number(e.target.value))}
                                    className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 ring-blue-100 transition-all cursor-pointer min-w-[200px]"
                                >
                                    {sveFirme.map((f) => <option key={f.id} value={f.id}>{f.nazivLokacije}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                            {/* Leva kolona: Info */}
                            <div className="xl:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                        <BuildingIcon size={120} />
                                    </div>
                                    
                                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                        Osnovni podaci
                                    </h3>
                                    
                                    <div className="space-y-5">
                                        {[
                                            { label: "Brend / Firma", val: nazivFirme, sub: "Pravno ime" },
                                            { label: "Adresa", val: trenutnaFirma?.adresa || 'Nije uneta', sub: "Lokacija na mapi" },
                                            { label: "Kontakt telefon", val: trenutnaFirma?.telefon || 'Nije unet', sub: "Javni broj za klijente", isBlue: true }
                                        ].map((item, i) => (
                                            <div key={i} className="group cursor-default">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{item.label}</p>
                                                <p className={`font-semibold ${item.isBlue ? 'text-blue-600 underline underline-offset-4' : 'text-gray-700'}`}>
                                                    {item.val}
                                                </p>
                                                <p className="text-[10px] text-gray-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{item.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`relative overflow-hidden rounded-3xl border shadow-sm p-6 transition-all
                                                ${statusOnlineZakazivanja 
                                                    ? "bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-100/50" 
                                                    : "bg-white border-gray-100"}`}>
                                    {/* Glow pozadina kada je aktivno */}
                                    {statusOnlineZakazivanja && (
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
                                    )}

                                    <div className="relative space-y-6">

                                        {/* Header */}
                                        <div className="flex flex-col gap-2 items-center justify-between">
                                            <div>
                                                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
                                                    Online zakazivanje
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    Omogućite klijentima da sami rezervišu termine.
                                                </p>
                                            </div>

                                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2
                                                ${statusOnlineZakazivanja 
                                                    ? "bg-green-100 text-green-700" 
                                                    : "bg-gray-100 text-gray-500"}`}>
                                                <span className={`w-2 h-2 rounded-full 
                                                    ${statusOnlineZakazivanja ? "bg-green-500" : "bg-gray-400"}`} />
                                                {statusOnlineZakazivanja ? "Aktivno" : "Neaktivno"}
                                            </div>
                                        </div>

                                        {/* Link box */}
                                        <div className="space-y-2">
                                            <p className="text-xs uppercase font-bold text-gray-400">
                                                Link za zakazivanje
                                            </p>

                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                                <input
                                                    readOnly
                                                    value="https://studioflow.rs/zakazivanja/studio%20Casual"
                                                    className="flex-1 bg-transparent text-sm font-medium text-gray-700 outline-none"
                                                />
                                                <button
                                                    onClick={() => navigator.clipboard.writeText("https://studioflow.rs/zakazivanja/studio%20Casual")}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    Kopiraj
                                                </button>
                                            </div>
                                        </div>

                                        {/* CTA dugme – Aktivacija */}
                                        <button
                                            onClick={() => { setStatusOnlineZakazivanja(!statusOnlineZakazivanja); toast.success(`Uspešno ste ${statusOnlineZakazivanja ? 'Deaktivirali' : 'Aktivirali'} online zakazivanje`)}}
                                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer
                                                ${statusOnlineZakazivanja
                                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200"}`}
                                        >
                                            {statusOnlineZakazivanja 
                                                ? "Deaktiviraj zakazivanje" 
                                                : "Aktiviraj online zakazivanje"}
                                        </button>

                                        {/* Dugme za dizajn – prikazuje se SAMO kada je aktivno */}
                                        {statusOnlineZakazivanja && (
                                            <button
                                                onClick={() => setIsDesignModalOpen(true)} // ili šta već planiraš
                                                className="w-full py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer
                                                        bg-white border border-gray-200 text-gray-800
                                                        hover:bg-gray-100"
                                            >
                                                🎨 Promeni dizajn online zakazivanja
                                            </button>
                                        )}
                                        
                                    </div>
                                </div>                            
                            </div>

                            {/* Desna kolona: Radno Vreme */}
                            <div className="xl:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Radno Vreme</h3>
                                    <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-md font-bold">Aktivno</span>
                                </div>

                                <div className="space-y-3">
                                    {radnoVreme.map((dan, index) => (
                                        <div key={index} className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${dan.isNeradniDan ? 'bg-gray-50/50 border-transparent grayscale italic' : 'bg-white border-gray-50 hover:border-blue-100 hover:shadow-md hover:shadow-blue-50/20'}`}>
                                            <span className="w-24 font-bold text-sm text-gray-600">
                                                {["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"][index]}
                                            </span>
                                            
                                            <div className={`flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl transition-opacity ${dan.isNeradniDan ? 'opacity-20' : 'opacity-100'}`}>
                                                <input type="time" value={dan.od} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "od", e.target.value)} className="bg-transparent border-none font-bold text-gray-900 text-sm focus:ring-0 cursor-pointer" />
                                                <span className="text-gray-300 font-light">—</span>
                                                <input type="time" value={dan.do} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "do", e.target.value)} className="bg-transparent border-none font-bold text-gray-900 text-sm focus:ring-0 cursor-pointer" />
                                            </div>

                                            <button 
                                                onClick={() => handleVremeChange(index, "isNeradniDan", !dan.isNeradniDan)}
                                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${dan.isNeradniDan ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                            >
                                                {dan.isNeradniDan ? 'Zatvoreno' : 'Otvoreno'}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => selektovanaFirmaId && sacuvajRadnoVreme(selektovanaFirmaId, radnoVreme)} 
                                    className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
                                >
                                    <span>Sačuvaj izmene vremena</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
        <>
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

        <OnlineZakazivanjeModal
            isOpen={isDesignModalOpen}
            onClose={() => setIsDesignModalOpen(false)}
        />
        </>
    );
}

