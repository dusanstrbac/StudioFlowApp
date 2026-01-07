'use client';
import { KategorijeUslugeDTO, UslugaModalProps } from "@/types/Usluge";
import { useState, useEffect } from "react";

export default function UslugaModal({ isOpen, onClose, onSave, initialData, salons, selectedSalonId, firmaId }: UslugaModalProps) {

    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [nameId, setNameId] = useState<number | null>(null);
    const [price, setPrice] = useState<number>(0);
    const [uslugeGrupe, setUslugeGrupe] = useState<KategorijeUslugeDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const lokacijaId = selectedSalonId;
    const [errors, setErrors] = useState({ categoryId: false, nameId: false, price: false, lokacijaId: false });

    // Fetch usluge
    useEffect(() => {
        const fetchUsluge = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajUsluge`);
                if (!res.ok) throw new Error("Greška prilikom učitavanja usluga");
                const data: KategorijeUslugeDTO[] = await res.json();

                // Sortiranje
                const sorted = data
                    .map(group => ({
                        ...group,
                        uslugeDTO: [...group.uslugeDTO].sort((a, b) =>
                            a.nazivUsluge.localeCompare(b.nazivUsluge, "sr", { sensitivity: "base" })
                        )
                    }))
                    // Sortiranje kategorije usluga
                    .sort((a, b) =>
                        a.nazivKategorije.localeCompare(b.nazivKategorije, "sr", { sensitivity: "base" })
                    );

                setUslugeGrupe(sorted);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsluge();
    }, []);

    // Prikaz usluga shodno odabranoj kategoriji usluga
    const currentCategory = uslugeGrupe.find(g => g.id === categoryId);

    // Postavljanje initial data ili default vrednosti
    useEffect(() => {
        if (!loading && uslugeGrupe.length > 0) {
            if (initialData) {
                setCategoryId(initialData.categoryId || null);
                setNameId(initialData.nameId || null);
                //setPrice(initialData.price || 0);

            } else {
                setCategoryId(null);
                setNameId(null);
                setPrice(0);
            }
        }
    }, [loading, uslugeGrupe, initialData, salons]);

    const handleSave = async () => {
        const newErrors = {
            categoryId: !categoryId,
            nameId: !nameId,
            price: !price,
            lokacijaId: !lokacijaId
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(e => e)) {
            return;
        }

        const payload = {
            idFirme: firmaId,
            idLokacije: selectedSalonId,
            idKategorije: categoryId,
            idUsluge: nameId,
            cena: price
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/UpisiUslugu`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) { throw new Error("Greška pri upisu usluge."); }
            const responseData = await res.json();

            // Zameniti sa sooner-om umesto sa console.logom
            console.log("API odgovor:", responseData);

            onSave(payload);
            onClose();
            window.location.reload();

        } catch (error) {
            console.error("Greška:", error);
            alert("Došlo je do greške prilikom upisivanja usluge.");
        }
    };

    // Tastatura eventovi
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 'ESC' - Zatvaranje modala
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) { window.addEventListener("keydown", handleKeyDown); }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>

                <h2 className="text-xl font-bold mb-4 text-center">
                    Dodaj - Izmeni uslugu
                </h2>

                {loading ? (
                    <p className="text-center py-4">Učitavanje usluga...</p>
                ) : (
                    <>
                        {/* Kategorija */}
                        <label className="block mb-2">
                            <span className="text-sm font-medium">Kategorija:</span>
                            <select
                                className={`w-full p-2 border rounded mt-1 ${errors.categoryId ? 'border-red-500' : ''}`}
                                value={categoryId || ""}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCategoryId(val);
                                    const firstUslugaId = uslugeGrupe.find(g => g.id === val)?.uslugeDTO[0]?.id || null;
                                    setNameId(firstUslugaId);
                                    setErrors(prev => ({ ...prev, categoryId: false, nameId: false })); // resetuj grešku
                                }}
                            >
                                <option value="">Izaberi kategoriju</option>
                                {uslugeGrupe.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.nazivKategorije}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Naziv usluge */}
                        <label className="block mb-2">
                            <span className="text-sm font-medium">Naziv usluge:</span>
                            <select
                                className={`w-full p-2 border rounded mt-1 ${errors.nameId ? 'border-red-500' : ''}`}
                                value={nameId || ""}
                                onChange={(e) => {
                                    setNameId(Number(e.target.value));
                                    setErrors(prev => ({ ...prev, nameId: false }));
                                }}
                                disabled={!categoryId}
                            >
                                <option value="">Izaberi naziv usluge</option>
                                {currentCategory?.uslugeDTO.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nazivUsluge}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                )}

                {/* Cena */}
                <label className="block mb-2">
                    <span className="text-sm font-medium">Cena (RSD):</span>
                    <input
                        type="number"
                        className={`w-full p-2 border rounded mt-1 ${errors.price ? 'border-red-500' : ''}`}
                        value={price}
                        onChange={(e) => {
                            setPrice(Number(e.target.value));
                            setErrors(prev => ({ ...prev, price: false }));
                        }}
                    />
                </label>

                {/* Lokacija */}
                <label className="block mb-4">
                    <span className="text-sm font-medium">Lokacija:</span>
                    <select
                        className={`w-full p-2 border rounded mt-1 bg-gray-100 text-gray-500 cursor-not-allowed ${
                            errors.lokacijaId ? 'border-red-500' : ''
                        }`}
                        value={lokacijaId ?? ""}
                        disabled
                    >
                        {salons.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.nazivLokacije}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Dugmad */}
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 cursor-pointer"
                        onClick={onClose}
                    >
                        Otkaži
                    </button>

                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                        onClick={handleSave}
                    >
                        Sačuvaj
                    </button>
                </div>
            </div>
        </div>
    );
}
