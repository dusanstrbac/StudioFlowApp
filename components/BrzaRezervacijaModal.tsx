'use client';
import { useState, useEffect } from "react";
import { getCookie } from "cookies-next";
import { User, X, Phone, Timer, ChevronRight, Check, Loader2 } from "lucide-react";

// --- INTERFEJSI ---

interface Usluga {
  id: number;
  nazivUsluge: string;
  cena: number;
  nazivKategorije: string;
}

interface SlobodanTermin {
  vreme: string;
  radnik: string;
  idRadnika?: number;
}

interface GrupisaniTermini {
  [vreme: string]: SlobodanTermin[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BrzaRezervacijaModal = ({ isOpen, onClose }: Props) => {
  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Pretraga, 2: Termini, 3: Klijent
  const [loading, setLoading] = useState(false);
  const [loadingUsluge, setLoadingUsluge] = useState(true);
  const [usluge, setUsluge] = useState<Usluga[]>([]);
  const [selectedTermin, setSelectedTermin] = useState<SlobodanTermin | null>(null);
  const [slobodniTermini, setSlobodniTermini] = useState<SlobodanTermin[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ime: "",
    telefon: "",
    uslugaId: "",
    trajanje: 30,
    datum: new Date().toISOString().split('T')[0],
    vremeOd: "08:00",
    radnik: "Bilo ko"
  });

  // --- EFEKTI ---
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const fetchUsluge = async () => {
        setLoadingUsluge(true);
        try {
          const token = getCookie("AuthToken");
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajAsortiman?idFirme=1`, {
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

  const handleFindSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = getCookie("AuthToken");
      const url = `${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ProveriSlobodneTermine?idFirme=1&idLokacije=1&datum=${formData.datum}&trajanjeMinuta=${formData.trajanje}`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data: SlobodanTermin[] = await response.json();
        if (data.length === 0) {
          setError("Nema slobodnih termina za izabrani dan.");
        } else {
          const filtriraniTermini = data.filter((t) => t.vreme >= formData.vremeOd);
          setSlobodniTermini(filtriraniTermini);
          setStep(2);
        }
      } else {
        setError("Neuspešna provera termina.");
      }
    } catch {
      setError("Greška pri povezivanju sa serverom.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTermin = (termin: SlobodanTermin) => {
    setSelectedTermin(termin);
    setStep(3);
  };

  // Grupisanje termina po vremenu (satnici)
  const grupisaniTermini = slobodniTermini.reduce<GrupisaniTermini>((acc, curr) => {
    if (!acc[curr.vreme]) {
      acc[curr.vreme] = [];
    }
    acc[curr.vreme].push(curr);
    return acc;
  }, {});

  const handleFinalConfirm = async () => {
    if (!selectedTermin) return;
    
    setLoading(true);
    try {
      console.log("Rezervacija se šalje:", {
        klijent: formData.ime,
        tel: formData.telefon,
        usluga: formData.uslugaId,
        vreme: selectedTermin.vreme
      });

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1000);
    } catch (err) {
      setLoading(false);
      console.error("Greška:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black font-sans">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100">

        {/* HEADER MODALA */}
        <div className="p-7 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="font-black text-xl tracking-tighter uppercase text-gray-900">
              {step === 1 && "Brza rezervacija"}
              {step === 2 && "Slobodni Termini"}
              {step === 3 && "Podaci o klijentu"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2 animate-shake">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          {/* KORAK 1: IZBOR USLUGE I FILTERI */}
          {step === 1 && (
            <form onSubmit={handleFindSlots} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usluga iz asortimana</label>
                  <div className="relative">
                    {loadingUsluge ? (
                      <div className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-2 text-gray-400 text-xs italic">
                        <Loader2 size={14} className="animate-spin" /> Učitavam...
                      </div>
                    ) : (
                      <select
                        required
                        className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-black text-black"
                        value={formData.uslugaId}
                        onChange={e => setFormData({ ...formData, uslugaId: e.target.value })}
                      >
                        <option value="" className="text-black">Izaberite uslugu...</option>
                        {usluge.map(u => (
                          <option key={u.id} value={u.id} className="text-black">
                            {u.nazivUsluge} — {u.cena} RSD
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trajanje</label>
                  <div className="relative text-black">
                    <input
                      type="number"
                      value={formData.trajanje}
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-center outline-none focus:ring-2 focus:ring-black"
                      onChange={e => setFormData({ ...formData, trajanje: parseInt(e.target.value) || 0 })}
                    />
                    <span className="absolute right-3 top-3.5 text-[9px] font-bold text-gray-300 uppercase">min</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Datum pretrage</label>
                  <input
                    type="date"
                    value={formData.datum}
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-black text-black"
                    onChange={e => setFormData({ ...formData, datum: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">Najranije od</label>
                  <input
                    type="time"
                    value={formData.vremeOd}
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-black text-black"
                    onChange={e => setFormData({ ...formData, vremeOd: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingUsluge || loading}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Pronađi slobodna mesta"}
              </button>
            </form>
          )}

          {/* KORAK 2: PRIKAZ SLOBODNIH TERMINA */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planer za: {formData.datum}</span>
                <div className="flex items-center gap-1 text-blue-600 font-bold text-xs italic">
                  <Timer size={14} /> {formData.trajanje} min
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                {Object.keys(grupisaniTermini).map((vreme) => (
                  <div key={vreme} className="relative">
                    <div className="sticky top-0 z-10 flex items-center gap-3 bg-white mb-3">
                      <span className="text-sm font-black text-black bg-gray-100 px-3 py-1 rounded-full shadow-sm">
                        {vreme}h
                      </span>
                      <div className="h-[1px] flex-1 bg-gray-100"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 ml-4">
                      {grupisaniTermini[vreme].map((t, i) => (
                        <button
                          key={`${vreme}-${i}`}
                          onClick={() => handleSelectTermin(t)}
                          className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.98] group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <User size={16} />
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-bold text-gray-900">{t.radnik}</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-tighter">Slobodan slot</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3 text-gray-400 font-bold text-[9px] uppercase tracking-widest hover:text-black border-t"
              >
                ← Promeni parametre pretrage
              </button>
            </div>
          )}

          {/* KORAK 3: FINALNI UNOS PODATAKA O KLIJENTU */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300 text-black">
              <div className="bg-gray-900 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Potvrda termina</p>
                  <p className="text-lg font-bold">{selectedTermin?.vreme}h — {selectedTermin?.radnik}</p>
                  <p className="text-[11px] text-blue-400 font-medium">{formData.datum}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Check size={24} className="text-green-400" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ime klijenta</label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 text-gray-300" size={18} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Unesite ime..."
                      className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black font-bold text-sm text-black"
                      onChange={e => setFormData({ ...formData, ime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Kontakt telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 text-gray-300" size={18} />
                    <input
                      type="tel"
                      placeholder="06..."
                      className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black font-bold text-sm text-black"
                      onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFinalConfirm}
                  disabled={loading || !formData.ime}
                  className="w-full py-5 bg-green-500 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] hover:bg-green-600 transition-all shadow-xl shadow-green-100 flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Zakaži Termin"}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full text-center text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-4 hover:text-red-500 transition-colors"
                >
                  Promeni termin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrzaRezervacijaModal;