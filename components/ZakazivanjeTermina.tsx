'use client';
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { FirmaAsortimanDTO } from "@/types/firma";
import { Address } from "@/types/zakazivanje";
import { getCookie } from "cookies-next";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BadgeEuro, Briefcase, Clock, InfoIcon, MapPin, PhoneCall, User, X } from "lucide-react";

interface ZakazivanjeTerminaProps {
  onClose: () => void;
  date: string; // YYYY-MM-DD
  asortiman: FirmaAsortimanDTO[];
  onTerminZakazi?: () => void;
  idLokacije: number;
}

const ZakazivanjeTermina = ({ onClose, date, asortiman, onTerminZakazi, idLokacije }: ZakazivanjeTerminaProps) => {
  const [selectedService, setSelectedService] = useState<string>(''); 
  const [userName, setUserName] = useState<string>(''); 
  const [arrivalTime, setArrivalTime] = useState<string>(''); 
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [customCena, setCustomCena] = useState<number | ''>('');
  const [napoma, setNapomena] = useState<string>('');
  const [telefonKorisnika, setTelefonKorisnika] = useState<string>('');
  const [errors, setErrors] = useState({ userName: false, selectedService: false, arrivalTime: false, selectedAddress: false });
  const korisnik = dajKorisnikaIzTokena();

  const dateObj = new Date(`${date}T00:00:00`);
  const formattedDate = `${dateObj.getDate()}. ${dateObj.toLocaleString("sr-Latn-RS", { month: "long" })} ${dateObj.getFullYear()}`;

  const filteredAsortiman = asortiman.filter(u => 
    Number(u.idLokacije) === Number(selectedAddress)
  );

useEffect(() => {
    const fetchLokacije = async () => {
        try {
            const token = getCookie("AuthToken");
            if (!korisnik?.idFirme || !token) return;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme?idFirme=${korisnik.idFirme}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Server error:", errorText);
                return;
            }

            // Provera da li uopšte ima sadržaja pre parsiranja
            const text = await res.text();
            if (!text) return; 
            
            const data = JSON.parse(text);
            const lokacije: Address[] = data[0]?.lokacije || [];
            setAddresses(lokacije);

            const memorisanaLokacija = localStorage.getItem('active_salon_id');
            console.log(memorisanaLokacija)
            
            if (idLokacije) {
                setSelectedAddress(Number(idLokacije));
            } else if (memorisanaLokacija) {
                setSelectedAddress(Number(memorisanaLokacija));
            } else {
                setSelectedAddress(Number(korisnik?.idLokacije) || lokacije[0]?.id || null);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };
    fetchLokacije();
}, [korisnik?.idFirme, korisnik?.idLokacije, idLokacije]);

  useEffect(() => {
    if (!selectedAddress || !selectedService) {
      setCustomCena("");
      return;
    }

    const selected = asortiman.find(u => 
      Number(u.idUsluge) === Number(selectedService) && 
      Number(u.idLokacije) === Number(selectedAddress)
    );

    if (selected) {
      setCustomCena(selected.cena);
    } else {
      setCustomCena("");
    }
    // Ovde asortiman MORA biti prisutan
  }, [selectedService, selectedAddress, asortiman]);

  const rezervisiTermin = async () => {
    const newErrors = {
      userName: userName.trim() === "",
      selectedService: selectedService === "",
      arrivalTime: arrivalTime === "",
      selectedAddress: selectedAddress === null,
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(err => err)) {
      toast.error("Molimo popunite sva obavezna polja.");
      return;
    }

    try {
      const token = getCookie("AuthToken");
      const lokacija = addresses.find(a => a.id === selectedAddress);
      if (!lokacija) {
        toast.error("Greška: Lokacija nije pronađena.");
        return;
      }

      const datumTermina = `${date}T${arrivalTime}:00`;

      const payload = {
        idFirme: Number(korisnik?.idFirme),
        idLokacije: Number(lokacija.id),
        idUsluge: Number(selectedService),
        idZaposlenog: Number(korisnik?.idKorisnika),
        datumTermina,
        cena: customCena === "" ? 0 : Number(customCena),
        imeMusterije: userName,
        napomena: napoma,
        brojTelefona: telefonKorisnika
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ZakaziTermin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Greška prilikom kreiranja termina.");
      }

      toast.success("Termin uspešno zakazan!");
      if(onTerminZakazi) onTerminZakazi();
      onClose();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Došlo je do nepoznate greške.");
      }
    }
  };

  return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center z-[100] p-0 sm:p-4 transition-all duration-300">
            <div className="absolute inset-0 -z-10" onClick={onClose} />
            
            <motion.div
                className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Novi termin</h2>
                        <p className="text-sm text-blue-600 font-medium">{formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Sadržaj Forme */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                    
                    {/* Ime i Prezime */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <User size={16} className="text-blue-500" /> Ime i prezime korisnika
                        </label>
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all ${errors.userName ? "border-red-500 ring-2 ring-red-50" : "border-gray-200 focus:border-blue-500 focus:bg-white"}`}
                            placeholder="Npr. Marko Marković"
                        />
                    </div>

                    {/* Dve kolone za Vreme i Cenu na desktopu */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Clock size={16} className="text-blue-500" /> Vreme dolaska
                            </label>
                            <input
                                type="time"
                                value={arrivalTime}
                                onChange={(e) => setArrivalTime(e.target.value)}
                                className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all ${errors.arrivalTime ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:bg-white"}`}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <BadgeEuro size={16} className="text-blue-500" /> Cena usluge (RSD)
                            </label>
                            <input
                                type="number"
                                value={customCena}
                                onChange={(e) => setCustomCena(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Izbor Usluge */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Briefcase size={16} className="text-blue-500" /> Tip usluge
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {filteredAsortiman.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Prvo odaberite lokaciju...</p>
                            ) : (
                                <select
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    className={`w-full p-3 bg-gray-50 border rounded-xl outline-none transition-all cursor-pointer ${errors.selectedService ? "border-red-500" : "border-gray-200 focus:border-blue-500 focus:bg-white"}`}
                                >
                                    <option value="" disabled>Izaberi uslugu</option>
                                    {filteredAsortiman.map((u) => (
                                        <option key={u.idUsluge} value={u.idUsluge}>{u.nazivUsluge}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Adresa Lokacije - ZAKLJUČANO */}
                    <div className="space-y-1.5 opacity-80">
                        <label className="text-sm font-bold text-gray-500 flex items-center gap-2">
                            <MapPin size={16} /> Lokacija (fiksirano za ovaj kalendar)
                        </label>
                        <div className="relative">
                            <select
                                value={selectedAddress ?? ''}
                                disabled={true} // Uvek zaključano jer zakazujemo iz specifičnog kalendara
                                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl outline-none appearance-none cursor-not-allowed text-gray-600 font-semibold"
                            >
                                {addresses.map((a) => (
                                    <option key={a.id} value={a.id}>{a.nazivLokacije} - {a.adresa}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <InfoIcon size={14} className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Broj telefona */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <PhoneCall size={16} className="text-blue-500" /> Broj telefona
                        </label>
                        <input
                            type="tel"
                            value={telefonKorisnika}
                            onChange={(e) => setTelefonKorisnika(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                            placeholder="Npr. 064 123 4567"
                        />
                    </div>


                    {/* Napomena */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <InfoIcon size={16} className="text-blue-500" /> Napomena <p className="text-gray-400">(opciono)</p>
                        </label>
                        <textarea value={napoma} onChange={(e) => setNapomena(e.target.value)} className="border-1 border-gray-400 rounded-md w-full max-h-[100px] px-1">
                        </textarea>
                    </div>
                </div>


                {/* Footer Akcije */}
                <div className="p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={rezervisiTermin}
                        className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
                    >
                        Zakaži termin
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ZakazivanjeTermina;
