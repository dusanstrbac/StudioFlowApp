'use client';
import DodajInventar from "@/components/DodajInventar";
import UslugaModal from "@/components/UslugaModal";
import { Firma, FirmaAsortimanDTO, FirmaInventarDTO, Lokacije } from "@/types/firma";
import { getCookie } from "cookies-next";
import { motion } from "framer-motion";
import { Edit2, Trash2 } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";

const tabs = ['Osnovne informacije', 'Zaposleni', 'Inventar', 'Usluge'];

export default function SalonPage() {
    const [firma, setFirma] = useState<Firma | null>(null); 
    const [salons, setSalons] = useState<Lokacije[]>([]);
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const [isInventarModalOpen, setInventoryModalOpen] = useState(false);
    const [isUslugeModalOpen, setIsUslugeModalOpen] = useState(false);
    const [asortiman, setAsortiman] = useState<FirmaAsortimanDTO[]>([]);
    
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
    const tabRefs = useRef<(HTMLButtonElement | null)[]>(Array(tabs.length).fill(null));
    const selectedSalon = salons.find(s => s.id === selectedSalonId);
    const [inventory, setInventory] = useState<FirmaInventarDTO[]>([]);
    const [searchInventoryTerm, setSearchInventoryTerm] = useState("");
    const [searchServiceTerm, setSearchServiceTerm] = useState(""); 
    const [searchTerm, setSearchTerm] = useState("");

    // Pomeranje linije ispod taba
    useEffect(() => {
        const index = tabs.findIndex(tab => tab === activeTab);
        const currentTab = tabRefs.current[index];
        const container = containerRef.current;

        if (currentTab instanceof HTMLElement && container) {
            const left = currentTab.offsetLeft; 
            const width = currentTab.offsetWidth;
            setUnderlineStyle({ left, width });
        }
    }, [activeTab]);

    // Fetch firme
    useEffect(() => {
        const fetchFirma = async () => {
            try {
                const token = getCookie("AuthToken");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data[0]) {
                    setFirma(data[0]);
                    setSalons(data[0].lokacije || []);
                    setSelectedSalonId(data[0].lokacije[0]?.id || null);
                }
            } catch (error) {
                console.error('Greška prilikom učitavanja firme:', error);
            }
        };
        fetchFirma();
    }, []);

    // Fetch asortimana i inventara
    useEffect(() => {
        if (!selectedSalonId || !firma) return;

        const fetchData = async () => {
            const token = getCookie("AuthToken");
            
            // Fetch Asortiman
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/DajAsortiman?idFirme=${firma.id}&idLokacije=${selectedSalonId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAsortiman(data);
                }
            } catch (err) {
                console.error("Greška asortiman:", err);
            }

            // Fetch Inventar
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Inventar/DajInventar?idFirme=${firma.id}&idLokacije=${selectedSalonId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInventory(data);
                }
            } catch (err) {
                console.error("Greška inventar:", err);
            }
        };

        fetchData();
    }, [selectedSalonId, firma]);

    const filteredServices = useMemo(() => {
        if (!asortiman) return [];
        return asortiman
            .filter(service => service.idLokacije === selectedSalonId)
            .filter(service =>
                service.nazivUsluge.toLowerCase().includes(searchServiceTerm.toLowerCase())
            )
            .sort((a, b) => a.nazivUsluge.localeCompare(b.nazivUsluge, "sr"));
    }, [asortiman, selectedSalonId, searchServiceTerm]);

    const handleDeleteService = async (service: FirmaAsortimanDTO) => {
        if (!confirm("Da li ste sigurni da želite da obrišete ovu uslugu?")) return;
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Usluge/ObrisiUslugu`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    idFirme: service.idFirme,
                    idLokacije: service.idLokacije,
                    idKategorije: service.idKategorije,
                    idUsluge: service.idUsluge
                }),
            });
            if (!res.ok) throw new Error();
            setAsortiman(prev => prev.filter(s => s.idUsluge !== service.idUsluge));
            toast.success("Usluga obrisana");
        } catch (err) {
            console.error(err);
            toast.error("Greška pri brisanju");
        }
    };

    const filteredEmployees = (selectedSalon?.zaposleni ?? [])
        .filter((z) => {
            const search = searchTerm.toLowerCase();
            return z.ime.toLowerCase().includes(search) || 
                   z.uloga.toLowerCase().includes(search);
        });

    const handleDeleteInventar = async (item: FirmaInventarDTO) => {
        if (!confirm(`Obriši ${item.nazivProizvoda}?`)) return;
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Inventar/ObrisiArtikal`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ idInventara: item.id, idFirme: firma?.id, idLokacije: selectedSalonId })
            });
            if (res.ok) {
                setInventory(prev => prev.filter(i => i.id !== item.id));
                toast.success("Artikal obrisan");
            }
        } catch (err) {
            console.error(err);
            toast.error("Greška");
        }
    };

    const handleUpdateMinKolicina = async (item: FirmaInventarDTO, novaKolicina: number) => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Inventar/AzurirajMinKolicinu`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    idInventara: item.id, 
                    idFirme: firma?.id, 
                    idLokacije: selectedSalonId, 
                    minKolicina: novaKolicina 
                })
            });
            if (res.ok) {
                setInventory(prev => prev.map(i => i.id === item.id ? { ...i, minKolicina: novaKolicina } : i));
                toast.success("Minimalna količina ažurirana");
            }
        } catch (err) {
            console.error(err);
            toast.error("Greška pri ažuriranju");
        }
    };

    const getInventoryStatus = (item: FirmaInventarDTO) => {
        if (item.trenutnaKolicina < item.minKolicina) return { label: "Potrebna nabavka", color: "text-red-500" };
        if (item.trenutnaKolicina === item.minKolicina) return { label: "Na minimumu", color: "text-yellow-500" };
        return { label: "U redu", color: "text-gray-300" };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(amount);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Osnovne informacije':
                return (
                    <div className="py-10 px-4">
                        <div className="flex justify-between items-end border-b border-black pb-8 mb-12">
                            <div>
                                <h2 className="text-5xl font-light tracking-tighter">{firma?.naziv}</h2>
                                <p className="text-sm text-gray-500 mt-4 uppercase tracking-widest">
                                    {selectedSalon?.nazivLokacije} — {selectedSalon?.adresa}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                            {[
                                { label: 'Tim', value: filteredEmployees.length, sub: 'zaposlenih' },
                                { label: 'Meni', value: filteredServices.length, sub: 'usluga' },
                                { label: 'Magacin', value: inventory.length, sub: 'artikala' },
                                { label: 'Menadžment', value: 'Milica P.', sub: 'odgovorno lice' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{item.label}</p>
                                    <p className="text-3xl font-light">{item.value}</p>
                                    <p className="text-xs text-gray-400 italic">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'Zaposleni':
                return (
                    <div className="space-y-8 py-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-lg font-light text-gray-400 uppercase italic">Naš Tim</h3>
                            <input
                                type="text"
                                placeholder="Traži..."
                                className="text-sm bg-transparent italic outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            {filteredEmployees.map((z, idx) => (
                                <div key={idx} className="group flex items-center justify-between py-5 border-b hover:border-black transition-colors">
                                    <div className="flex items-center gap-6">
                                        <span className="text-xs font-mono text-gray-300">0{idx + 1}</span>
                                        <div>
                                            <p className="text-lg font-medium">{z.ime}</p>
                                            <p className="text-[11px] text-gray-400 uppercase">{z.uloga}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-2 h-2 rounded-full ${z.statusRada === 'aktivan' ? 'bg-black' : 'bg-gray-200'}`} />
                                        <Edit2 size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'Inventar':
                return (
                    <div className="space-y-10 py-4">
                        <div className="flex justify-between items-end border-b border-black pb-4">
                            <h3 className="text-lg font-light text-gray-400 uppercase italic">Zalihe</h3>
                            <div className="flex gap-6">
                                <input 
                                    type="text" 
                                    placeholder="Pretraži..." 
                                    className="text-xs bg-transparent italic outline-none"
                                    value={searchInventoryTerm}
                                    onChange={(e) => setSearchInventoryTerm(e.target.value)}
                                />
                                <button onClick={() => setInventoryModalOpen(true)} className="text-[10px] font-bold uppercase border border-black px-4 py-1">
                                    + Dodaj
                                </button>
                            </div>
                        </div>
                        <div className="divide-y">
                            {inventory.filter(i => i.nazivProizvoda.toLowerCase().includes(searchInventoryTerm.toLowerCase())).map((item) => {
                                const status = getInventoryStatus(item);
                                return (
                                    <div key={item.id} className="group flex items-center py-6 hover:bg-gray-50 px-2">
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-lg font-light">{item.nazivProizvoda}</p>
                                                <div className="flex-1 border-b border-dotted mx-2"></div>
                                                <p className="text-sm font-mono">{item.trenutnaKolicina} <span className="text-[10px] text-gray-400">KOM</span></p>
                                            </div>
                                            <div className="flex gap-6 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 uppercase">Min:</span>
                                                    <input 
                                                        type="number"
                                                        value={item.minKolicina}
                                                        className="text-[10px] font-bold w-10 bg-transparent outline-none"
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setInventory(prev => prev.map(i => i.id === item.id ? { ...i, minKolicina: val } : i));
                                                        }}
                                                        onBlur={(e) => handleUpdateMinKolicina(item, parseInt(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8 ml-12">
                                            <span className={`text-[10px] font-bold uppercase ${status.color}`}>{status.label}</span>
                                            <div className="flex gap-4 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleDeleteInventar(item)} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'Usluge':
                return (
                    <div className="space-y-10 py-4">
                        <div className="flex justify-between items-end border-b border-black pb-4">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-lg font-light text-gray-400 uppercase italic">Cenovnik</h3>
                                <input 
                                    type="text"
                                    placeholder="Pretraži usluge..."
                                    className="text-xs bg-transparent italic outline-none"
                                    value={searchServiceTerm}
                                    onChange={(e) => setSearchServiceTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={() => setIsUslugeModalOpen(true)} className="text-[10px] font-bold uppercase border border-black px-4 py-1">
                                + Nova Usluga
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
                            {filteredServices.map((service) => (
                                <div key={service.idUsluge} className="group py-4 border-b flex flex-col">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="text-base font-medium group-hover:text-blue-600">{service.nazivUsluge}</h4>
                                        <span className="text-sm font-light">{formatCurrency(service.cena)}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{service.nazivKategorije}</p>
                                        <Trash2 size={12} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500" onClick={() => handleDeleteService(service)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header Sekcija: Naslov, Selektor Salona i Tabovi */}
            <div className="flex flex-col gap-4 mb-8 border-b border-gray-100">
                {/* Gornji red: Naslov i Selektor */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 px-1">Salon</h1>
                    
                    {selectedSalon && (
                        <div className="w-full sm:w-auto px-1"> 
                            <select
                                value={selectedSalonId ?? ''}
                                onChange={(e) => setSelectedSalonId(parseInt(e.target.value))}
                                className="w-full sm:min-w-[200px] p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 ring-blue-50 transition-all cursor-pointer appearance-none"
                            >
                                {salons.map((salon) => (
                                    <option key={salon.id} value={salon.id}>
                                        {firma?.naziv} - {salon.nazivLokacije}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 ml-1 hidden sm:block">
                                {selectedSalon.adresa}
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigacija (Tabovi) sa Horizontalnim Scrollom na mobilnom */}
                <div className="relative overflow-x-auto no-scrollbar scroll-smooth" ref={containerRef}>
                    <div className="flex min-w-max">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab}
                                ref={(el) => { tabRefs.current[index] = el; }} 
                                className={`
                                    px-4 sm:px-6 py-3 text-sm font-bold transition-all duration-300
                                    ${activeTab === tab ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                                `}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    
                    {/* Animirana linija ispod aktivnog taba */}
                    <motion.span 
                        className="absolute bottom-0 h-0.5 bg-blue-600 rounded-full"
                        animate={{ 
                            left: underlineStyle.left, 
                            width: underlineStyle.width 
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                </div>
            </div>

            {/* Glavni Sadržaj Taba */}
            <div className="min-h-[400px]">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {renderTabContent()}
                </motion.div>
            </div>

            {/* Modali */}
            <UslugaModal 
                isOpen={isUslugeModalOpen} 
                onClose={() => setIsUslugeModalOpen(false)} 
                onSave={() => {
                    toast.success("Usluga registrovana");
                    // Ovde možeš dodati re-fetch asortimana ako je potrebno
                }}
                salons={salons} 
                selectedSalonId={selectedSalonId ?? 0} 
                firmaId={firma?.id ?? 0} 
            />

            <DodajInventar 
                isOpen={isInventarModalOpen} 
                onClose={() => setInventoryModalOpen(false)} 
                onSave={() => {
                    toast.success("Artikal dodat");
                    // Ovde možeš dodati re-fetch inventara
                }}
                salons={salons} 
                selectedSalonId={selectedSalonId || 0} 
                firmaId={firma?.id || 0} 
            />
        </div>
    );
}