'use client';
import { useState, useEffect } from "react";
import { getCookie } from "cookies-next";
import { X, Timer, ChevronRight, Check, Loader2, Banknote, Phone, User, InfoIcon } from "lucide-react";
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { toast } from "sonner";

// --- INTERFEJSI ---
interface Usluga {
  idUsluge: number; 
  nazivUsluge: string;
  cena: number;
}

interface SlobodanTermin {
  vreme: string;
  radnik: string;
  idRadnika: number;
  datum: string;
}

interface GrupisaniTermini {
  [vreme: string]: SlobodanTermin[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BrzaRezervacijaModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingUsluge, setLoadingUsluge] = useState(true);
  const [usluge, setUsluge] = useState<Usluga[]>([]);
  const [selectedTermin, setSelectedTermin] = useState<SlobodanTermin | null>(null);
  const [slobodniTermini, setSlobodniTermini] = useState<SlobodanTermin[]>([]);
  const [error, setError] = useState<string | null>(null);

  const dajTrenutnoVreme = () => {
    const sada = new Date();
    sada.setMinutes(sada.getMinutes() + 1); // dodaje 1 minut
    const sati = sada.getHours().toString().padStart(2, '0');
    const minuti = sada.getMinutes().toString().padStart(2, '0');
    return `${sati}:${minuti}`;
  };
  const danas = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    ime: "",
    telefon: "",
    uslugaId: "", 
    cena: 0,
    trajanje: 30,
    datum: new Date().toISOString().split('T')[0],
    vremeOd: "08:00",
    napomena: ""
  });

  const formatirajDatumZaPrikaz = (datum: string) => {
    if (!datum) return "";

    return new Date(datum).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Ako je danasnji datum i vreme je u proslosti, daj trenutno vreme
  useEffect(() => {
    const sada = dajTrenutnoVreme();

    if (formData.datum === danas && formData.vremeOd < sada) {
      setFormData(prev => ({ ...prev, vremeOd: sada }));
    }
  }, [formData.datum]);

  // --- DOHVATANJE ASORTIMANA ---
  useEffect(() => {
    if (isOpen) {      
      setStep(1);
      setError(null);
      setSelectedTermin(null);
      const fetchUsluge = async () => {
        setLoadingUsluge(true);
        try {
          const korisnik = dajKorisnikaIzTokena();
          const token = getCookie("AuthToken");
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajAsortiman?idFirme=${korisnik?.idFirme}&idLokacije=${korisnik?.idLokacije}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          if (response.ok) {
            const data: Usluga[] = await response.json();
            setUsluge(data);
          }
        } catch (err) {
          console.error("Greška pri učitavanju asortimana:", err);
        } finally {
          setLoadingUsluge(false);
        }
      };
      fetchUsluge();
    }
  }, [isOpen]);

  // --- HANDLERI ---
  const handleUslugaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const izabranaUsluga = usluge.find(u => u.idUsluge.toString() === selectedId);
    
    setFormData({
      ...formData,
      uslugaId: selectedId,
      cena: izabranaUsluga ? izabranaUsluga.cena : 0
    });
  };

  const handleFindSlots = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.uslugaId) {
      setError("Morate izabrati uslugu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const korisnik = dajKorisnikaIzTokena();
      const token = getCookie("AuthToken");

      const url = `${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ProveriSlobodneTermine?idFirme=${korisnik?.idFirme}&idLokacije=${korisnik?.idLokacije}&datum=${formData.datum}&trajanjeMinuta=${formData.trajanje}&vremeOd=${formData.vremeOd}&idRadnika=${korisnik?.idKorisnika}`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data: SlobodanTermin[] = await response.json();

        if (data.length === 0) {
          setError("Nema slobodnih termina.");
          return;
        }

        const filtrirani = data.filter(t => t.vreme >= formData.vremeOd);

        if (filtrirani.length === 0) {
          setError("Nema slobodnih termina u izabranom vremenskom opsegu.");
          return;
        }

        setSlobodniTermini(filtrirani);
        setStep(2);

      } else {
        let poruka = "Došlo je do greške.";

        try {
          const err = await response.json();
          poruka = err.message || poruka;
        } catch {
          poruka = await response.text();
        }

        setError(poruka);
      }
    } catch {
      setError("Server nije dostupan.");
    } finally {
      setLoading(false);
    }
  };


  const handleFinalConfirm = async () => {
    if (!selectedTermin) return;
    setLoading(true);
    setError(null);
    
    try {
      const korisnik = dajKorisnikaIzTokena();
      const token = getCookie("AuthToken");

      const payload = {
        idFirme: Number(korisnik?.idFirme),
        idLokacije: Number(korisnik?.idLokacije),
        idUsluge: Number(formData.uslugaId),
        idZaposlenog: Number(selectedTermin.idRadnika),
        datumTermina: `${formData.datum}T${selectedTermin.vreme}:00`,
        cena: Number(formData.cena),
        imeMusterije: formData.ime,
        brojTelefona: formData.telefon,
        napomena: formData.napomena
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ZakaziTermin`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success("Termin uspešno zakazan!");
        window.dispatchEvent(new Event("terminZakazanGlobalno"));
        
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const errorText = await response.text();
        setError(errorText || "Greška prilikom upisa.");
      }
    } catch {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  };

  const grupisaniTermini = slobodniTermini.reduce<GrupisaniTermini>((acc, curr) => {
    if (!acc[curr.vreme]) acc[curr.vreme] = [];
    acc[curr.vreme].push(curr);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black font-sans">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        
        {/* HEADER */}
        <div className="p-7 border-b flex justify-between items-center bg-gray-50/50">
          <h2 className="font-black text-xl tracking-tighter uppercase text-gray-900">
            {step === 1 && "Brza rezervacija"}
            {step === 2 && "Slobodni Termini"}
            {step === 3 && "Podaci o klijentu"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          {/* KORAK 1: FILTERI */}
          {step === 1 && (
            <form onSubmit={handleFindSlots} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Usluga
                  </label>

                  {loadingUsluge ? (
                    <div className="w-full p-3.5 bg-gray-100 border border-gray-200 rounded-2xl flex items-center gap-3">
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                      <span className="text-sm font-bold text-gray-400">
                        Učitavanje usluga...
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold"
                      value={formData.uslugaId}
                      onChange={handleUslugaChange}
                    >
                      <option value="">Izaberite uslugu...</option>
                      {usluge.map((u, index) => (
                        <option key={`${u.idUsluge}-${index}`} value={u.idUsluge}>
                          {u.nazivUsluge}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trajanje (min)</label>
                    <div className="relative">
                       <Timer className="absolute left-3 top-3.5 text-gray-300" size={16} />
                       <input
                        type="number"
                        className="w-full p-3.5 pl-10 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none"
                        value={formData.trajanje}
                        onChange={e => setFormData({ ...formData, trajanje: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Cena (RSD)</label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-3.5 text-blue-300" size={16} />
                      <input
                        type="number"
                        className="w-full p-3.5 pl-10 bg-blue-50 border border-blue-100 rounded-2xl text-sm font-black text-blue-700 outline-none"
                        value={formData.cena}
                        onChange={e => setFormData({ ...formData, cena: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Datum</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                    value={formData.datum}
                    onChange={e => setFormData({ ...formData, datum: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Početno vreme</label>
                  <input
                    type="time"
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                    value={formData.vremeOd}
                    onChange={e => setFormData({ ...formData, vremeOd: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Pronađi slobodna mesta"}
              </button>
            </form>
          )}

          {/* KORAK 2: TERMINI */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                {Object.keys(grupisaniTermini).sort().map((vreme) => (
                  <div key={`group-${vreme}`}>
                    <div className="sticky top-0 bg-white py-2 text-xs font-black text-gray-400">{vreme}h</div>
                    <div className="grid gap-2">
                      {grupisaniTermini[vreme].map((t, i) => (
                        <button
                          key={`${vreme}-${t.idRadnika}-${i}`}
                          onClick={() => { setSelectedTermin(t); setStep(3); }}
                          className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-500 transition-all group"
                        >
                          <span className="text-sm font-bold">{t.radnik}</span>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="w-full py-3 text-gray-400 font-bold text-[9px] uppercase tracking-widest">← Nazad na filtere</button>
            </div>
          )}

          {/* KORAK 3: KLIJENT I POTVRDA */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-900 p-6 rounded-[2rem] text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Rezime</p>
                  <p className="text-lg font-bold">{formatirajDatumZaPrikaz(formData.datum)}</p>
                  <p className="text-lg font-bold">{selectedTermin?.vreme}h — {formData.cena} RSD</p>
                  <p className="text-xs text-blue-400">{selectedTermin?.radnik}</p>
                </div>
                <Check size={24} className="text-green-400" />
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-4 text-gray-300" size={18} />
                  <input
                    type="text"
                    placeholder="Ime i prezime klijenta"
                    className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={formData.ime}
                    onChange={e => setFormData({ ...formData, ime: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 text-gray-300" size={18} />
                  <input
                    type="tel"
                    placeholder="Broj telefona (opciono)"
                    className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={formData.telefon}
                    onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <InfoIcon className="absolute left-4 top-4 text-gray-300" size={18} />
                  <input
                    type="text"
                    placeholder="Napomena (opciono)"
                    className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={formData.napomena}
                    onChange={e => setFormData({ ...formData, napomena: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={handleFinalConfirm}
                disabled={loading || !formData.ime }
                className="w-full py-5 bg-green-500 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] hover:bg-green-600 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Potvrdi Rezervaciju"}
              </button>
              <button onClick={() => setStep(2)} className="w-full py-3 text-gray-400 font-bold text-[9px] uppercase tracking-widest">← Nazad na termine</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrzaRezervacijaModal;