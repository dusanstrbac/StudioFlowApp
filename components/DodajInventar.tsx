'use client';
import { getCookie } from "cookies-next";
import { useState, useEffect } from "react";

interface Kategorija {
    id: number;
    nazivKategorije: string;
}

interface Salon {
    id: number;
    nazivLokacije: string;
}

interface InventarPayload {
    idFirme: number;
    idLokacije: number;
    idKategorije: number | null;
    nazivProizvoda: string;
    trenutnaKolicina: number | null;
    minKolicina: number;
}

interface InventarModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Zamenjen 'any' sa 'InventarPayload'
    onSave: (payload: InventarPayload) => void; 
    initialData?: {
        idKategorije?: number;
        nazivProizvoda?: string;
        minKolicina?: number;
    } | null;
    salons: Salon[];
    selectedSalonId: number;
    firmaId: number;
}

export default function InventarModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    salons, 
    selectedSalonId, 
    firmaId,
}: InventarModalProps) {

    const [kategorije, setKategorije] = useState<Kategorija[]>([]);
    const [kategorijaId, setKategorijaId] = useState<number | null>(null);
    const [nazivProizvoda, setNazivProizvoda] = useState<string>("");
    const [kolicina, setKolicina] = useState<number | null>(null);
    
    // Obrisali smo setMinKolicina jer se ne koristi za čitanje, 
    // samo se šalje u payload-u iz initialData

    const lokacijaId = selectedSalonId;

    const [errors, setErrors] = useState({
        kategorijaId: false,
        nazivProizvoda: false,
        kolicina: false
    });

    useEffect(() => {
        const fetchKategorije = async () => {
            try {
                const token = getCookie("AuthToken");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajKategorije`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Greška prilikom učitavanja kategorija");
                const data: Kategorija[] = await res.json();
                setKategorije(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchKategorije();
    }, []);  

    useEffect(() => {
        if (initialData) {
            setKategorijaId(initialData.idKategorije ?? null);
            setNazivProizvoda(initialData.nazivProizvoda ?? "");
            setKolicina(null); 
        } else {
            setKategorijaId(null);
            setNazivProizvoda("");
            setKolicina(null);
        }
    }, [initialData]);

    const handleSave = async () => {
        const newErrors = {
            kategorijaId: !kategorijaId,
            nazivProizvoda: !nazivProizvoda.trim(),
            kolicina: !kolicina || kolicina <= 0,
        };

        setErrors(newErrors);
        if (Object.values(newErrors).some(e => e)) return;

        const payload = {
            idFirme: firmaId,
            idLokacije: selectedSalonId,
            idKategorije: kategorijaId,
            nazivProizvoda,
            trenutnaKolicina: kolicina,
            minKolicina: initialData?.minKolicina ?? 1
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Inventar/DodajInventar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Greška pri upisu inventara");

            onSave(payload);
            onClose();
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Došlo je do greške.");
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50" 
            onClick={onClose}
        >
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-center">
                    {initialData ? "Ažuriraj inventar" : "Dodaj artikal u inventar"}
                </h2>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Kategorija:</span>
                    <select
                        className={`w-full p-2 border rounded mt-1 ${errors.kategorijaId ? "border-red-500" : ""}`}
                        value={kategorijaId ?? ""}
                        onChange={(e) => {
                            setKategorijaId(Number(e.target.value));
                            setErrors(prev => ({ ...prev, kategorijaId: false }));
                        }}
                    >
                        <option value="">Izaberi kategoriju</option>
                        {kategorije.map((k) => (
                            <option key={k.id} value={k.id}>
                                {k.nazivKategorije}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Naziv artikla:</span>
                    <input
                        type="text"
                        className={`w-full p-2 border rounded mt-1 ${errors.nazivProizvoda ? "border-red-500" : ""}`}
                        placeholder="Unesite naziv..."
                        value={nazivProizvoda}
                        onChange={(e) => {
                            setNazivProizvoda(e.target.value);
                            setErrors(prev => ({ ...prev, nazivProizvoda: false }));
                        }}
                    />
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Količina:</span>
                    <input
                        type="number"
                        className={`w-full p-2 border rounded mt-1 ${errors.kolicina ? "border-red-500" : ""}`}
                        value={kolicina ?? ""}
                        onChange={(e) => {
                            setKolicina(Number(e.target.value));
                            setErrors(prev => ({ ...prev, kolicina: false }));
                        }}
                    />
                </label>

                <label className="block mb-4">
                    <span className="text-sm font-medium">Lokacija:</span>
                    <select className="w-full p-2 border rounded mt-1 bg-gray-100" value={lokacijaId} disabled>
                        {salons.map((s) => (
                            <option key={s.id} value={s.id}>{s.nazivLokacije}</option>
                        ))}
                    </select>
                </label>

                <div className="flex justify-end gap-3">
                    <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={onClose}>
                        Otkaži
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSave}>
                        Sačuvaj
                    </button>
                </div>
            </div>
        </div>
    );
}