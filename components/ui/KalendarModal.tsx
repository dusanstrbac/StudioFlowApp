'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardClock, ClipboardList, Clock, Package, Receipt, ShoppingCart, Trash2, User, X } from 'lucide-react';
import ZakazivanjeTermina from '../ZakazivanjeTermina';
import { Client } from '@/types/klijenti';
import { FirmaAsortimanDTO } from '@/types/firma';
import { dajKorisnikaIzTokena } from '@/lib/auth';
import { getCookie } from 'cookies-next';
import { toast } from 'sonner';
import UnosTroskaModal from '../UnosTroskaModal';

// --- INTERFEJSI ---
export interface KalendarModalProps {
    date: Date;
    onClose: () => void;
    asortiman: FirmaAsortimanDTO[];
    onTerminZakazan?: () => void;
}

interface TerminDTO {
    id: number;
    imeMusterije: string;
    nazivUsluge: string;
    datumTermina: string;
    cena: number;
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

const KalendarModal: React.FC<KalendarModalProps> = ({ date, onClose, asortiman, onTerminZakazan }) => {
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

    const otvoriZakazivanjeModal = useCallback(() => setIsZakazivanjeOpen(true), []);
    const zatvoriZakazivanjeModal = useCallback(() => setIsZakazivanjeOpen(false), []);


    useEffect(() => {
        const updateWidth = () => {
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            // Na mobilnom je širina 0 jer sidebar nije fiksno sa strane
            if (window.innerWidth < 1024) {
                setSidebarWidth('0px');
            } else {
                setSidebarWidth(isCollapsed ? '80px' : '240px');
            }
        };

        updateWidth(); // Inicijalno proveri
        window.addEventListener('sidebar_changed', updateWidth);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('sidebar_changed', updateWidth);
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    const toggleDeleteMode = useCallback(() => {
        if (!isDeleteMode && clients.length === 0) {
            toast.error("Nema zakazanih termina za brisanje", {
                description: "Lista je već prazna.",
            });
            return;
        }
        setIsDeleteMode(prev => !prev);
    }, [isDeleteMode, clients.length]);

    // --- API POZIVI ---
    const fetchTermini = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajZakazaneTermine?idFirme=${korisnik?.idFirme}&idLokacije=${korisnik?.idLokacije}&datumZakazivanja=${sqlDate}`);
            if (!response.ok) throw new Error(`Greška: ${response.status}`);
            
            const data: TerminDTO[] = await response.json();

            const mapiraniKlijenti: Client[] = data.map((termin) => ({
                id: termin.id,
                name: termin.imeMusterije,
                service: termin.nazivUsluge,
                time: new Date(termin.datumTermina).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }),
                price: termin.cena,
            }));

            mapiraniKlijenti.sort((a, b) => {
                const vremeA = new Date(`1970-01-01T${a.time}`);
                const vremeB = new Date(`1970-01-01T${b.time}`);
                return vremeA.getTime() - vremeB.getTime();
            });

            setClients(mapiraniKlijenti);
        } catch (error) {
            console.error('Greška pri učitavanju termina:', error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, [korisnik?.idFirme, korisnik?.idLokacije, sqlDate]);

    const fetchTroskovi = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DajTroskove?idFirme=${korisnik?.idFirme}&idLokacije=${korisnik?.idLokacije}&datum=${sqlDate}`);
            if (!response.ok) throw new Error("Greška pri učitavanju troškova");
            
            // Ovde koristimo TrosakDTO umesto TerminDTO
            const data: TrosakDTO[] = await response.json();
            
            // Ovde umesto (t: any) koristimo (t: TrosakDTO)
            const mapiraniTroskovi: Expense[] = data.map((t: TrosakDTO) => ({
                id: t.id,
                description: t.opis,
                amount: t.iznos,
                category: t.kategorija
            }));

            setExpenses(mapiraniTroskovi);
        } catch (error) {
            console.error("Greška pri dohvatanju troškova:", error);
        }
    }, [korisnik?.idFirme, korisnik?.idLokacije, sqlDate]);

    // --- EFFECTI ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isZakazivanjeOpen) {
                    zatvoriZakazivanjeModal();
                    return;
                }
                onClose();
            }
            if (e.shiftKey && e.key === "F1") {
                e.preventDefault();
                toggleDeleteMode();
            }
            if (e.shiftKey && e.key === "F2") {
                e.preventDefault();
                otvoriZakazivanjeModal();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isZakazivanjeOpen, toggleDeleteMode, otvoriZakazivanjeModal, zatvoriZakazivanjeModal, onClose]);

    useEffect(() => {
        fetchTermini();
        fetchTroskovi();
    }, [fetchTermini, fetchTroskovi]);

    // --- HANDLERI ---
    const obrisiTermin = async (id: number) => {
        try {
            const token = getCookie("AuthToken");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/ObrisiTermin?id=${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                toast.success("Termin uspešno otkazan");
                setClients(prev => prev.filter(c => c.id !== id));
                setIsDeleteMode(false);
                if (onTerminZakazan) onTerminZakazan();
            } else {
                toast.error("Greška pri brisanju sa servera");
            }
        } catch {
            toast.error("Sistemska greška: Backend nije dostupan");
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
                toast.success("Trošak uspešno obrisan");
                setExpenses(prev => prev.filter(e => e.id !== id));
                setIsDeleteMode(false);
            }
        } catch {
            toast.error("Greška pri brisanju troška");
        }
    };

    const stampajListing = () => {
        if (clients.length === 0) {
            toast.error("Nema termina za štampanje");
            return;
        }

        const ukupnaZarada = clients.reduce((sum, client) => sum + Number(client.price), 0);
        const prozorZaStampu = window.open('', '_blank');

        if (!prozorZaStampu) {
            toast.error("Iskočite prozor je blokiran!");
            return;
        }

        const sadrzaj = `
      <html>
        <head>
          <title>Listing termina - ${formattedDate}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { margin-bottom: 5px; }
            .datum { font-size: 16px; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; }
            .ukupno-red { background-color: #eee; font-weight: bold; }
            .suma-box { 
              margin-top: 20px; 
              text-align: right; 
              font-size: 20px; 
              font-weight: bold;
              border-top: 2px solid #333;
              padding-top: 10px;
            }
            .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
            @media print { @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <h1>Dnevni listing termina</h1>
          <div class="datum">Lokal: <strong>${korisnik?.idLokacije || 'Glavni lokal'}</strong> | Datum: ${formattedDate}</div>
          <table>
            <thead>
              <tr>
                <th>Vreme</th>
                <th>Klijent</th>
                <th>Usluga</th>
                <th style="text-align: right;">Cena (RSD)</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => `
                <tr>
                  <td>${c.time}</td>
                  <td>${c.name}</td>
                  <td>${c.service}</td>
                  <td style="text-align: right;">${c.price.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="ukupno-red">
                <td colspan="3" style="text-align: right;">UKUPNO:</td>
                <td style="text-align: right;">${ukupnaZarada.toLocaleString()} RSD</td>
              </tr>
            </tfoot>
          </table>
          <div class="suma-box">
            Ukupan promet za dan: ${ukupnaZarada.toLocaleString()} RSD
          </div>
          <div class="footer">Izveštaj generisan: ${new Date().toLocaleString('sr-RS')}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

        prozorZaStampu.document.write(sadrzaj);
        prozorZaStampu.document.close();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-0 sm:p-4 transition-all duration-300 ease-in-out"
            style={{ 
                // Desktop: pomera se u desno zbog shodno state-u sidebara
                paddingLeft: window.innerWidth >= 1024 ? sidebarWidth : '0px',
                // Mobilni: spusta se ceo kontejner ispod headera
                paddingTop: window.innerWidth < 1024 ? '64px' : '0px'
            }}
        >
            {/* Overlay koji služi za zatvaranje na klik van modala */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />

            <motion.div
                className="bg-white w-full h-full sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[75%] sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                layout // Dodato za glatku promenu veličine unutar modala
            >
                {/* Header - Bolji padding za mobilni */}
                <div className="flex justify-between items-center px-4 py-4 sm:px-8 border-b border-gray-100 bg-white">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{formattedDate}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs - Centrirano na mobilnom */}
                <div className="flex px-4 sm:px-8 bg-white border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('termini')}
                        className={`flex-1 sm:flex-none py-4 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 ${
                            activeTab === 'termini' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        REZERVACIJE ({clients.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('troskovi')}
                        className={`flex-1 sm:flex-none py-4 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 ${
                            activeTab === 'troskovi' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        TROŠKOVI ({expenses.length})
                    </button>
                </div>

                {/* Sadržaj - Skrolabilna zona */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-full gap-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-500 text-sm">Učitavanje podataka...</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-3">
                            <AnimatePresence mode="popLayout">
                                {activeTab === 'termini' ? (
                                    clients.length === 0 ? (
                                        <p className="text-center text-gray-400 py-10 italic">Nema zakazanih termina.</p>
                                    ) : (
                                        clients.map((client) => (
                                            <motion.div
                                                key={client.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-2"
                                            >
                                                {/* LEVA STRANA: Ime i Usluga */}
                                                <div className="flex items-center gap-3 min-w-0 flex-1"> 
                                                    <div className="bg-blue-50 p-2 rounded-lg text-blue-500 hidden xs:block shrink-0">
                                                        <User size={18} />
                                                    </div>
                                                    <div className="min-w-0"> {/* min-w-0 sprečava pucanje layouta kod dugih imena */}
                                                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                                            {client.name}
                                                        </p>
                                                        <div className="flex items-center gap-1 text-gray-500 text-[11px] sm:text-xs">
                                                            <Package size={12} className="shrink-0" />
                                                            <span className="truncate">{client.service}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* DESNA STRANA: Vreme i Cena - Sada uvek u liniji */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {!isDeleteMode ? (
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1 text-blue-600 font-bold text-sm">
                                                                <Clock size={14} />
                                                                <span>{client.time}</span>
                                                            </div>
                                                            <div className="text-green-600 font-semibold text-[11px] sm:text-sm whitespace-nowrap">
                                                                {Number(client.price).toLocaleString()} RSD
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => obrisiTermin(client.id)}
                                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )
                                ) : (
                                    expenses.length === 0 ? (
                                        <p className="text-center text-gray-400 py-10 italic">Nema upisanih troškova.</p>
                                    ) : (
                                        expenses.map((exp) => (
                                            <motion.div
                                                key={exp.id}
                                                layout
                                                className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-50 rounded-lg text-red-500">
                                                        <ShoppingCart size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800">{exp.description}</p>
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                                            {exp.category || 'Ostalo'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isDeleteMode ? (
                                                    <button onClick={() => obrisiTrosak(exp.id)} className="p-2 text-red-600"><Trash2 size={20} /></button>
                                                ) : (
                                                    <span className="font-bold text-red-600">-{Number(exp.amount).toLocaleString()}</span>
                                                )}
                                            </motion.div>
                                        ))
                                    )
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer - Fiksan na dnu */}
                <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex gap-3 sm:justify-end items-center">
                    
                    {/* Obriši dugme */}
                    <button
                        onClick={toggleDeleteMode}
                        className={`
                            flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-sm
                            flex-1 sm:flex-none sm:min-w-[120px]
                            ${isDeleteMode ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                    >
                        <Trash2 size={18} />
                        <span>{isDeleteMode ? "Završi" : "Obriši"}</span>
                    </button>

                    {/* Zakaži / Trošak dugme */}
                    <button
                        onClick={activeTab === 'termini' ? otvoriZakazivanjeModal : () => setIsTrosakOpen(true)}
                        className="
                            flex-1 sm:flex-none sm:min-w-[140px]
                            flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-sm shadow-sm
                        "
                    >
                        {activeTab === 'termini' ? <ClipboardClock size={18} /> : <Receipt size={18} />}
                        <span>{activeTab === 'termini' ? "Zakaži" : "Trošak"}</span>
                    </button>

                    {/* Štampaj dugme */}
                    <button
                        onClick={stampajListing}
                        className="
                            flex-1 sm:flex-none sm:min-w-[120px]
                            flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-all text-sm shadow-sm
                        "
                    >
                        <ClipboardList size={18} />
                        <span>Štampaj</span>
                    </button>
                </div>

                {isZakazivanjeOpen && (
                    <ZakazivanjeTermina onClose={zatvoriZakazivanjeModal} date={sqlDate} asortiman={asortiman} onTerminZakazi={() => { fetchTermini(); onTerminZakazan?.(); }} />
                )}
                {isTrosakOpen && (
                    <UnosTroskaModal date={sqlDate} onClose={() => setIsTrosakOpen(false)} onSuccess={fetchTroskovi} />
                )}
            </motion.div>
        </div>
    );
};

export default KalendarModal;