'use client';
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { FirmaAsortimanDTO } from "@/types/firma";
import { getCookie } from "cookies-next";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BadgeEuro, Briefcase, Clock, User, X } from "lucide-react";

interface TerminZaIzmenu {
  id: number;
  imeMusterije: string;
  idUsluge: number;
  datumTermina: string;
  cena: number;
  napomena: string;
  telefon: string;
  idLokacije: number;
}

interface PromenaTerminaProps {
  onClose: () => void;
  termin: TerminZaIzmenu;
  asortiman: FirmaAsortimanDTO[];
  onTerminIzmenjen?: () => void;
}

const PromenaTermina = ({ onClose, termin, asortiman, onTerminIzmenjen }: PromenaTerminaProps) => {

  const korisnik = dajKorisnikaIzTokena();

  const [userName, setUserName] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [customCena, setCustomCena] = useState<number | ''>("");
  const [napomena, setNapomena] = useState("");
  const [telefon, setTelefon] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);

  // ✅ PREFILL
  useEffect(() => {
    if (!termin) return;

    setUserName(termin.imeMusterije);
    setSelectedService(String(termin.idUsluge));
    setCustomCena(termin.cena);
    setNapomena(termin.napomena || "");
    setTelefon(termin.telefon || "");
    setSelectedAddress(termin.idLokacije);

    // Izvuci samo vreme iz ISO string-a
    const time = new Date(termin.datumTermina);
    const hours = time.getHours().toString().padStart(2, "0");
    const minutes = time.getMinutes().toString().padStart(2, "0");
    setArrivalTime(`${hours}:${minutes}`);

  }, [termin]);

  const sacuvajIzmene = async () => {
    if (!userName || !selectedService || !arrivalTime || !selectedAddress) {
      toast.error("Molimo popunite sva obavezna polja.");
      return;
    }

    try {
      const token = getCookie("AuthToken");
      if (!token) throw new Error("Nema tokena.");

      // Kombinujemo datum termina iz originalnog datuma i vreme iz input-a
      const [year, month, day] = termin.datumTermina.split("T")[0].split("-");
      const datumTermina = `${year}-${month}-${day}T${arrivalTime}:00`;

      const payload = {
        id: termin.id,
        imeMusterije: userName,
        idUsluge: Number(selectedService),
        datumTermina,
        cena: Number(customCena),
        napomena: napomena || null,
        telefon: telefon || null,
        idLokacije: selectedAddress
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/IzmeniTermin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Greška pri čuvanju izmena.");

      toast.success("Termin uspešno izmenjen");
      onTerminIzmenjen?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Nepoznata greška");
    }
  };

  const dateObj = new Date(termin.datumTermina);
  const formattedDate = `${dateObj.getDate()}. ${dateObj.toLocaleString("sr-Latn-RS", { month: "long" })} ${dateObj.getFullYear()}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center z-[100] p-0 sm:p-4">
      <div className="absolute inset-0 -z-10" onClick={onClose} />
      
      <motion.div
        className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Izmena termina</h2>
            <p className="text-sm text-blue-600 font-medium">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          <div>
            <label className="text-sm font-bold flex items-center gap-2">
              <User size={16} className="text-blue-500" />
              Ime i prezime
            </label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 bg-gray-50 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-bold flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Vreme
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full p-3 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-bold flex items-center gap-2">
                <BadgeEuro size={16} className="text-blue-500" />
                Cena
              </label>
              <input
                type="number"
                value={customCena}
                onChange={(e) => setCustomCena(Number(e.target.value))}
                className="w-full p-3 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold flex items-center gap-2">
              <Briefcase size={16} className="text-blue-500" />
              Usluga
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full p-3 bg-gray-50 border rounded-xl"
            >
              {asortiman
                .filter(a => Number(a.idLokacije) === Number(selectedAddress))
                .map(a => (
                  <option key={a.idUsluge} value={a.idUsluge}>
                    {a.nazivUsluge}
                  </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold">Telefon</label>
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full p-3 bg-gray-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-bold">Napomena</label>
            <textarea
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className="w-full p-3 bg-gray-50 border rounded-xl"
            />
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border rounded-xl"
          >
            Otkaži
          </button>
          <button
            onClick={sacuvajIzmene}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl"
          >
            Sačuvaj izmene
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default PromenaTermina;