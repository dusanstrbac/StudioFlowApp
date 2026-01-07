'use client';
import BetaOverlay from "@/components/BetaOverlay";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { deleteCookie, getCookie } from "cookies-next";
import { BellIcon, BuildingIcon, PaletteIcon, PhoneCall, Shield } from "lucide-react";
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
        { naziv: "Notifikacije", ikonica: <BellIcon size={18} />},
        { naziv: "Sigurnost", ikonica: <Shield size={18} />},
        { naziv: "Tema / Izgled", ikonica: <PaletteIcon size={18} />},
        { naziv: "Lokal", ikonica: <BuildingIcon size={18} />},
        { naziv: "Pomoć i podrška", ikonica: <PhoneCall size={18} />}
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
                    <BetaOverlay isBlocked={true}>
                        <div className="space-y-10">
                            <div className="space-y-1">
                                <p className="text-lg font-bold">Email obaveštenja</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-md font-medium">Status: <span className={emailAktivan ? 'text-green-600' : 'text-red-500'}>{emailAktivan ? 'Aktivno' : 'Neaktivno'}</span></p>
                                    <button onClick={() => setEmailAktivan(!emailAktivan)} className={`py-2 px-6 rounded-lg text-sm text-white ${emailAktivan ? 'bg-red-500' : 'bg-green-600'}`}>
                                        {emailAktivan ? 'Isključi' : 'Uključi'}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold">SMS obaveštenja</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-md font-medium">Status: <span className={smsAktivan ? 'text-green-600' : 'text-red-500'}>{smsAktivan ? 'Aktivno' : 'Neaktivno'}</span></p>
                                    <button onClick={() => setSmsAktivan(!smsAktivan)} className={`py-2 px-6 rounded-lg text-sm text-white ${smsAktivan ? 'bg-red-500' : 'bg-green-600'}`}>
                                        {smsAktivan ? 'Isključi' : 'Uključi'}
                                    </button>
                                </div>
                            </div>
                            <div className="mt-10 pt-4 border-t border-gray-300 space-y-4">
                                <p className="text-lg font-bold">Filter obaveštenja</p>
                                {obavestenja.map((o) => (
                                    <label key={o.id} className="flex items-center justify-between cursor-pointer">
                                        <div><p className="font-medium">{o.naziv}</p><p className="text-sm text-gray-600">{o.opis}</p></div>
                                        <input type="checkbox" checked={o.status} onChange={() => toggleObavestenje(o.id)} className="h-5 w-5" />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </BetaOverlay>
                );
            case "Sigurnost":
                return (
                    <div className="space-y-20">
                        <div className="space-y-4">
                            <p className="text-lg font-bold">Promena lozinke</p>
                            <input type="password" placeholder="Stara lozinka" value={staraLozinka} onChange={(e) => setStaraLozinka(e.target.value)} className="border p-2 w-full rounded" />
                            <input type="password" placeholder="Nova lozinka" value={novaLozinka} onChange={(e) => setNovaLozinka(e.target.value)} className="border p-2 w-full rounded" />
                            <input type="password" placeholder="Potvrda lozinke" value={potvrdaLozinka} onChange={(e) => setPotvrdaLozinka(e.target.value)} className="border p-2 w-full rounded" />
                            <button onClick={promeniLozinku} className="bg-blue-500 text-white px-6 py-2 rounded float-right hover:bg-blue-600">Promeni lozinku</button>
                        </div>
                        <BetaOverlay isBlocked={true}>
                            <div className="flex items-center justify-between mt-10">
                                <div><p className="text-lg font-bold">2FA autentifikacija</p></div>
                                <button onClick={() => setIs2FAAktivan(!is2FAAktivan)} className={`px-4 py-2 rounded text-white ${is2FAAktivan ? 'bg-red-500' : 'bg-green-500'}`}>
                                    {is2FAAktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                                </button>
                            </div>
                        </BetaOverlay>
                    </div>
                );
            case "Lokal":
                return (
                    <div className="max-w-5xl mx-auto pb-10 space-y-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-500 uppercase">Aktivni lokal</label>
                            </div>
                            <select 
                                value={selektovanaFirmaId ?? ""} 
                                onChange={(e) => setSelektovanaFirmaId(Number(e.target.value))}
                                className="w-full md:w-72 px-4 py-3 bg-gray-50 border rounded-xl font-bold"
                            >
                                {sveFirme.map((f) => <option key={f.id} value={f.id}>{f.nazivLokacije}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-white p-6 rounded-2xl border space-y-4">
                                <h3 className="font-bold border-b pb-2">Osnovni podaci</h3>
                                <p><strong>Naziv:</strong> {nazivFirme}</p>
                                <p><strong>Adresa:</strong> {trenutnaFirma?.adresa || 'N/A'}</p>
                                <p><strong>Tel:</strong> {trenutnaFirma?.telefon || 'N/A'}</p>
                            </div>
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border">
                                <h3 className="font-bold border-b pb-4 mb-4">Radno vreme</h3>
                                <div className="space-y-3">
                                    {radnoVreme.map((dan, index) => (
                                        <div key={index} className="flex items-center justify-between gap-4">
                                            <span className="w-24 font-medium">{["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"][index]}</span>
                                            <input type="time" value={dan.od} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "od", e.target.value)} className="border p-1 rounded" />
                                            <span>-</span>
                                            <input type="time" value={dan.do} disabled={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "do", e.target.value)} className="border p-1 rounded" />
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={dan.isNeradniDan} onChange={(e) => handleVremeChange(index, "isNeradniDan", e.target.checked)} />
                                                <span className="text-xs">Zatvoreno</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => selektovanaFirmaId && sacuvajRadnoVreme(selektovanaFirmaId, radnoVreme)} className="mt-6 w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700">Sačuvaj radno vreme</button>
                            </div>
                        </div>
                    </div>
                );
            case "Pomoć i podrška":
                return (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <p><strong>Email:</strong> {emailTehnickePodrske}</p>
                            <p><strong>Tel:</strong> {telefonTehnickePodrske}</p>
                        </div>
                        <div className="border-t pt-6 space-y-4">
                            <p className="font-bold">Prijavi problem</p>
                            <textarea rows={4} value={opisProblema} onChange={(e) => setOpisProblema(e.target.value)} className="w-full border p-2 rounded" placeholder="Opis..." />
                            <button onClick={prijaviProblemPoruku} disabled={isSending} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
                                {isSending ? "Slanje..." : "Pošalji"}
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex h-[90vh] border border-gray-300 mt-[10px] bg-white">
            <div className="w-1/5 p-4 border-r bg-gray-50">
                <h2 className="text-lg font-bold mb-6">Podešavanja</h2>
                <ul className="space-y-3">
                    {sekcije.map((s) => (
                        <li key={s.naziv} onClick={() => setAktivnaSekcija(s.naziv)} className={`flex items-center gap-3 cursor-pointer p-2 rounded transition ${aktivnaSekcija === s.naziv ? "bg-blue-50 text-blue-600 font-bold" : "hover:bg-gray-100"}`}>
                            {s.ikonica} {s.naziv}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {sekcije.find(s => s.naziv === aktivnaSekcija)?.ikonica} {aktivnaSekcija}
                    </h1>
                    <p className="text-gray-500 mt-1">{sekcijaOpis}</p>
                </div>
                {renderSadrzaj()}
            </div>
        </div>
    );
}