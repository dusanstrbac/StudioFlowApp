'use client';
import { dajKorisnikaIzTokena } from "@/lib/auth";
import { korisnikJeVlasnik } from "@/lib/proveraUloge";
import { FirmaAsortimanDTO } from "@/types/firma";
import { Address } from "@/types/zakazivanje";
import { getCookie } from "cookies-next";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ZakazivanjeTerminaProps {
  onClose: () => void;
  date: string; // YYYY-MM-DD
  asortiman: FirmaAsortimanDTO[];
  onTerminZakazi?: () => void;
}

const ZakazivanjeTermina = ({ onClose, date, asortiman, onTerminZakazi }: ZakazivanjeTerminaProps) => {
  const [selectedService, setSelectedService] = useState<string>(''); 
  const [userName, setUserName] = useState<string>(''); 
  const [arrivalTime, setArrivalTime] = useState<string>(''); 
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [customCena, setCustomCena] = useState<number | ''>('');
  const [errors, setErrors] = useState({ userName: false, selectedService: false, arrivalTime: false, selectedAddress: false });
  const korisnik = dajKorisnikaIzTokena();
  const isReadOnly = !korisnikJeVlasnik(korisnik);

  const dateObj = new Date(`${date}T00:00:00`);
  const formattedDate = `${dateObj.getDate()}. ${dateObj.toLocaleString("sr-Latn-RS", { month: "long" })} ${dateObj.getFullYear()}`;

  const filteredAsortiman = asortiman.filter(u => 
    Number(u.idLokacije) === Number(selectedAddress)
  );

  useEffect(() => {
      const fetchLokacije = async () => {
        try {
          const token = getCookie("AuthToken");
          // Dodata provera da se fetch ne pokreće ako korisnik ne postoji
          if (!korisnik?.idFirme) return;

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme?idFirme=${korisnik.idFirme}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Greška prilikom učitavanja lokacija.");
          const data = await res.json();
          const lokacije: Address[] = data[0]?.lokacije || [];
          setAddresses(lokacije);

          if (!korisnikJeVlasnik(korisnik)) {
            setSelectedAddress(Number(korisnik?.idLokacije) || null);
          } else {
            setSelectedAddress(lokacije[0]?.id || null);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchLokacije();
      // Dodat korisnik u niz zavisnosti
    }, [korisnik]);

  useEffect(() => {
    if (!selectedAddress || !selectedService) {
      setCustomCena("");
      return;
    }

    // Pronađi uslugu koristeći Number() radi sigurnosti
    const selected = asortiman.find(u => 
      Number(u.idUsluge) === Number(selectedService) && 
      Number(u.idLokacije) === Number(selectedAddress)
    );

    if (selected) {
      setCustomCena(selected.cena);
    } else {
      setCustomCena("");
    }
    // DODAJ asortiman ovde u niz zavisnosti!
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
        imeMusterije: userName
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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
      <motion.div
        className="bg-white w-[90%] h-[90%] p-8 rounded-lg shadow-lg overflow-y-auto flex flex-col"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex justify-between items-center mb-4 w-full border-b border-gray-300 pb-2">
          <h2 className="text-2xl font-bold">Zakazivanje termina za {formattedDate}</h2>
          <button onClick={onClose} className="text-2xl text-gray-600 hover:text-gray-900 cursor-pointer">X</button>
        </div>

        <div className="mt-4">
          <label className="font-bold block">Ime i Prezime</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className={`w-full p-2 border rounded-md ${errors.userName ? "border-red-500" : "border-gray-300"}`}
            placeholder="Unesite ime i prezime korisnika"
          />
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <h3 className="font-bold">Odaberite uslugu</h3>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className={`w-full p-2 border rounded-md cursor-pointer ${errors.selectedService ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="" disabled>Izaberite uslugu</option>
            {filteredAsortiman.map((usluga) => (
              <option key={usluga.idUsluge} value={usluga.idUsluge}>
                {usluga.nazivUsluge}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <label className="font-bold block">Vreme dolaska</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className={`w-full p-2 border rounded-md ${errors.arrivalTime ? "border-red-500" : "border-gray-300"}`}
            />
          </div>

          <div className="mt-2">
            <label className="font-bold block">Cena usluge (RSD)</label>
            <input
              type="number"
              value={customCena === "" ? "" : customCena}
              onChange={(e) => {
                const value = e.target.value;
                setCustomCena(value === "" ? "" : Number(value));
              }}
              className="w-full p-2 border rounded-md"
              placeholder="Unesite cenu usluge"
            />
          </div>

          <div className="mt-4">
            <label className="font-bold block">Adresa salona</label>
            <select
              value={selectedAddress ?? ''}
              onChange={(e) => {
                setSelectedAddress(Number(e.target.value));
                setSelectedService('');
                setCustomCena('');
              }}
              disabled={isReadOnly}
              className={`w-full p-2 border rounded-md 
                ${errors.selectedAddress ? "border-red-500" : "border-gray-300"} 
                ${isReadOnly ? "bg-gray-200 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <option value="" disabled>Izaberite adresu</option>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.nazivLokacije} - {address.adresa}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Action Dugmad */}
        <div className="mt-auto flex gap-2 border-t border-gray-300 pt-4 justify-end">
          <button
            className="bg-red-500 text-white py-2 px-6 rounded-lg cursor-pointer 
                      transition-all duration-200 ease-in-out hover:bg-red-600 hover:scale-105"
            onClick={onClose}
          >
            Otkaži
          </button>
        <button
          className="bg-green-500 text-white py-2 px-6 rounded-lg cursor-pointer 
                    transition-all duration-200 ease-in-out hover:bg-green-600 hover:scale-105"
          onClick={rezervisiTermin}
        >
          Zakaži
        </button>
      </div>
      </motion.div>
    </div>
  );
};

export default ZakazivanjeTermina;
