'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    ClipboardClock, 
    Receipt, 
    ShoppingCart, 
    Trash2, 
    User, 
    X 
} from 'lucide-react';
import ZakazivanjeTermina from '../ZakazivanjeTermina';
import { Client } from '@/types/klijenti';
import { FirmaAsortimanDTO } from '@/types/firma';
import { dajKorisnikaIzTokena } from '@/lib/auth';
import { getCookie } from 'cookies-next';
import { toast } from 'sonner';
import UnosTroskaModal from '../UnosTroskaModal';

export interface KalendarModalProps {
    date: Date;
    onClose: () => void;
    asortiman: FirmaAsortimanDTO[];
    onTerminZakazan?: () => void;
    idLokacije: number;
}

interface TerminDTO {
    id: number;
    imeMusterije: string;
    nazivUsluge: string;
    datumTermina: string;
    cena: number;
    napomena: string;
    telefon: string;
}

interface Expense {
    id: number;
    description: string;
    amount: number;
    category?: string;
}

interface TrosakDTO {
    id: number;
    opis: string;
    iznos: number;
    kategorija?: string;
}

const KalendarModal: React.FC<KalendarModalProps> = ({ date, onClose, asortiman, onTerminZakazan, idLokacije }) => {
    const formattedDate = `${date.getDate()}. ${date.toLocaleString('sr-Latn-RS', { month: 'long' })} ${date.getFullYear()}`;
    const sqlDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    const korisnik = dajKorisnikaIzTokena();
    
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isZakazivanjeOpen, setIsZakazivanjeOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [activeTab, setActiveTab] = useState<'termini' | 'troskovi'>('termini');
    const [isTrosakOpen, setIsTrosakOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState('240px');
    const [selectedSalonId, setSelectedSalonId] = useState<number>(0);

    // --- SINHRONIZACIJA SA SIDEBAROM ---
    useEffect(() => {
        const syncId = () => {
            const saved = localStorage.getItem('active_salon_id');
            if (saved) {
                setSelectedSalonId(Number(saved));
            } else if (korisnik?.idLokacije) {
                setSelectedSalonId(Number(korisnik.idLokacije));
            }
        };

        syncId();
        window.addEventListener('salon_changed', syncId);
        return () => window.removeEventListener('salon_changed', syncId);
    }, [korisnik?.idLokacije]);

    // --- FETCH FUNKCIJE ---
    const fetchTermini = useCallback(async () => {
        // Čekamo da selectedSalonId bude postavljen
        if (!selectedSalonId || selectedSalonId === 0) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajZakazaneTermine?idFirme=${korisnik?.idFirme}&idLokacije=${selectedSalonId}&datumZakazivanja=${sqlDate}`);
            if (!response.ok) throw new Error(`Greška: ${response.status}`);
            
            const data: TerminDTO[] = await response.json();
            const mapiraniKlijenti: Client[] = data.map((termin) => ({
                id: termin.id,
                name: termin.imeMusterije,
                service: termin.nazivUsluge,
                time: new Date(termin.datumTermina).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }),
                price: termin.cena,
                napomena: termin.napomena,
                telefon: termin.telefon
            }));

            mapiraniKlijenti.sort((a, b) => a.time.localeCompare(b.time));
            setClients(mapiraniKlijenti);
        } catch (error) {
            console.error('Greška pri učitavanju termina:', error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, [korisnik?.idFirme, selectedSalonId, sqlDate]);

    const fetchTroskovi = useCallback(async () => {
        if (!selectedSalonId || selectedSalonId === 0) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajTroskove?idFirme=${korisnik?.idFirme}&idLokacije=${selectedSalonId}&datum=${sqlDate}`);
            if (response.ok) {
                const data: TrosakDTO[] = await response.json();
                setExpenses(data.map(t => ({ id: t.id, description: t.opis, amount: t.iznos, category: t.kategorija })));
            }
        } catch (error) {
            console.error(error);
        }
    }, [korisnik?.idFirme, selectedSalonId, sqlDate]);

    useEffect(() => {
        if (selectedSalonId !== 0) {
            fetchTermini();
            fetchTroskovi();
        }
    }, [selectedSalonId, sqlDate, fetchTermini, fetchTroskovi]);

    // Dinamičko pomeranje modala
    useEffect(() => {
        const updateWidth = () => {
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            if (window.innerWidth < 1024) {
                setSidebarWidth('0px');
            } else {
                setSidebarWidth(isCollapsed ? '80px' : '240px');
            }
        };
        updateWidth();
        window.addEventListener('sidebar_changed', updateWidth);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('sidebar_changed', updateWidth);
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    const obrisiTermin = async (id: number) => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ObrisiTermin?id=${id}`, {
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Termin obrisan");
                fetchTermini();
                onTerminZakazan?.();
            }
        } catch {
            toast.error("Greška pri brisanju");
        }
    };

    const obrisiTrosak = async (id: number) => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ObrisiTrosak?id=${id}`, {
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Trošak obrisan");
                fetchTroskovi();
            }
        } catch {
            toast.error("Greška pri brisanju");
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300"
            style={{ 
                paddingLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : '0px',
                paddingTop: typeof window !== 'undefined' && window.innerWidth < 1024 ? '64px' : '0px'
            }}
        >
            <div className="absolute inset-0 -z-10" onClick={onClose} />

            <motion.div 
                className="bg-white w-full h-full sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[75%] sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-4 sm:px-8 border-b bg-white">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{formattedDate}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-start px-4 sm:px-8 bg-white border-b">
                    <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                        <button 
                            onClick={() => setActiveTab('termini')} 
                            className={`flex-1 sm:flex-none py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-black tracking-widest border-b-2 transition-colors ${activeTab === 'termini' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}
                        >
                            REZERVACIJE ({clients.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('troskovi')} 
                            className={`flex-1 sm:flex-none py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-black tracking-widest border-b-2 transition-colors ${activeTab === 'troskovi' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400'}`}
                        >
                            TROŠKOVI ({expenses.length})
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-3">
                            <AnimatePresence mode="popLayout">
                                {activeTab === 'termini' ? (
                                    clients.length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                            <p className="text-gray-400 font-medium">Nema zakazanih termina za ovaj dan.</p>
                                        </div>
                                    ) : (
                                        clients.map(client => (
                                            <motion.div key={client.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center group">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-500"><User size={20} /></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{client.name}</p>
                                                        <p className="text-xs font-semibold text-gray-400">{client.service}</p>
                                                        <p className='text-xs text-orange-400 italic'>{client.napomena}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-blue-600 font-black text-sm">{client.time}</p>
                                                        <p className="text-green-600 font-bold text-xs">{client.price} RSD</p>
                                                    </div>
                                                    {isDeleteMode && (
                                                        <button onClick={() => obrisiTermin(client.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )
                                ) : (
                                    expenses.length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-red-200">
                                            <p className="text-gray-400 font-medium">Nema evidentiranih troškova.</p>
                                        </div>
                                    ) : (
                                        expenses.map(exp => (
                                            <motion.div key={exp.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-4 rounded-xl border border-red-50 shadow-sm flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-red-50 rounded-xl text-red-500"><ShoppingCart size={20} /></div>
                                                    <p className="font-bold text-gray-800">{exp.description}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="font-black text-red-600">-{exp.amount} RSD</span>
                                                    {isDeleteMode && (
                                                        <button onClick={() => obrisiTrosak(exp.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 bg-white border-t flex gap-3 justify-between sm:justify-end">
                    <button 
                        onClick={() => setIsDeleteMode(!isDeleteMode)} 
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isDeleteMode ? 'bg-red-600 text-white shadow-red-200 shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <Trash2 size={18} />
                        {isDeleteMode ? "Završi" : "Obriši"}
                    </button>
                    <button 
                        onClick={() => activeTab === 'termini' ? setIsZakazivanjeOpen(true) : setIsTrosakOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-green-100 shadow-lg hover:bg-green-700 hover:-translate-y-0.5 transition-all"
                    >
                        {activeTab === 'termini' ? <ClipboardClock size={18} /> : <Receipt size={18} />}
                        {activeTab === 'termini' ? "Novi termin" : "Novi trošak"}
                    </button>
                </div>
                
                {isZakazivanjeOpen && (
                    <ZakazivanjeTermina 
                        onClose={() => setIsZakazivanjeOpen(false)} 
                        date={sqlDate} 
                        asortiman={asortiman} 
                        idLokacije={selectedSalonId} 
                        onTerminZakazi={() => { 
                            fetchTermini(); 
                            onTerminZakazan?.(); 
                            setIsZakazivanjeOpen(false); 
                        }} 
                    />
                )}
                {isTrosakOpen && (
                    <UnosTroskaModal 
                        date={sqlDate} 
                        idLokacije={selectedSalonId} 
                        onClose={() => setIsTrosakOpen(false)} 
                        onSuccess={() => { 
                            fetchTroskovi(); 
                            setIsTrosakOpen(false); 
                        }} 
                    />
                )}
            </motion.div>
        </div>
    );
};

export default KalendarModal;