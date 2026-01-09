'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from './Button';
import { ClipboardClock, ClipboardList, Clock, CreditCard, Package, Receipt, ShoppingCart, Trash2, User } from 'lucide-react';
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

    const otvoriZakazivanjeModal = useCallback(() => setIsZakazivanjeOpen(true), []);
    const zatvoriZakazivanjeModal = useCallback(() => setIsZakazivanjeOpen(false), []);

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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
            <motion.div
                className="bg-white w-[90%] h-[90%] p-8 rounded-lg shadow-lg flex flex-col"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                layout
            >
                <div className="flex justify-between items-center mb-4 w-full border-b border-gray-300 pb-2">
                    <h2 className="text-2xl font-bold">{formattedDate}</h2>
                    <button onClick={onClose} className="text-2xl text-gray-600 hover:text-gray-900 cursor-pointer">X</button>
                </div>

                <div className="flex gap-6 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('termini')}
                        className={`pb-3 text-sm font-semibold transition-all ${activeTab === 'termini' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        REZERVACIJE ({clients.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('troskovi')}
                        className={`pb-3 text-sm font-semibold transition-all ${activeTab === 'troskovi' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        TROŠKOVI / FAKTURE ({expenses.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-gray-500 animate-pulse">Učitavanje podataka...</p>
                        </div>
                    ) : activeTab === 'termini' ? (
                        <div className="flex flex-col gap-3">
                            {clients.length === 0 ? (
                                <p className="text-gray-400 italic">Nema zakazanih termina za ovaj datum.</p>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {clients.map((client) => (
                                        <motion.div
                                            key={client.id}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                                            className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg shadow-sm bg-white w-full transition-shadow hover:shadow-md"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                    <span className="font-semibold text-gray-800">{client.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-5 h-5 text-purple-400" />
                                                    <span className="text-gray-500 text-sm">{client.service}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center min-w-[120px] justify-end mt-2 sm:mt-0">
                                                {!isDeleteMode ? (
                                                    <motion.div key="info" className="flex gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-blue-500" />
                                                            <span className="text-blue-600 font-medium">{client.time}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="w-4 h-4 text-green-500" />
                                                            <span className="text-green-600 font-bold">{Number(client.price).toLocaleString()} RSD</span>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.button
                                                        key="delete"
                                                        initial={{ opacity: 0, scale: 0.5 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => obrisiTermin(client.id)}
                                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={20} />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {expenses.length === 0 ? (
                                <p className="text-gray-400 italic">Nema upisanih troškova / faktura.</p>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {expenses.map((exp) => (
                                        <motion.div
                                            key={exp.id}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="relative flex justify-between items-center p-4 border border-red-100 rounded-lg shadow-sm bg-red-50/30 w-full"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-red-100 rounded-full text-red-600">
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{exp.description}</p>
                                                    <p className="text-[10px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase w-fit">
                                                        {exp.category || 'Ostalo'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {!isDeleteMode ? (
                                                    <span className="font-bold text-red-600 text-lg">
                                                        -{Number(exp.amount).toLocaleString()} RSD
                                                    </span>
                                                ) : (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.5 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        onClick={() => obrisiTrosak(exp.id)}
                                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={20} />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 border-t border-gray-300 pt-4 mt-4">
                    <Button
                        title={isDeleteMode ? "Završi" : activeTab === 'termini' ? "Otkaži termin" : "Obriši trošak"}
                        icon={<Trash2 size={18} />}
                        action={toggleDeleteMode}
                        className={isDeleteMode ? "bg-red-500 text-white" : ""}
                    />
                    <Button
                        title={activeTab === 'termini' ? "Zakaži termin" : "Dodaj trošak"}
                        icon={activeTab === 'termini' ? <ClipboardClock /> : <Receipt />}
                        className="transition-all duration-200 ease-in-out hover:bg-green-500 hover:text-white"
                        action={activeTab === 'termini' ? otvoriZakazivanjeModal : () => setIsTrosakOpen(true)}
                    />
                    <Button
                        title="Štampaj listing"
                        icon={<ClipboardList />}
                        className="transition-all duration-200 ease-in-out hover:bg-yellow-500 hover:text-white"
                        action={stampajListing}
                    />
                </div>

                {isZakazivanjeOpen && (
                    <ZakazivanjeTermina
                        onClose={zatvoriZakazivanjeModal}
                        date={sqlDate}
                        asortiman={asortiman}
                        onTerminZakazi={() => {
                            fetchTermini();
                            if (onTerminZakazan) onTerminZakazan();
                        }}
                    />
                )}

                {isTrosakOpen && (
                    <UnosTroskaModal
                        date={sqlDate}
                        onClose={() => setIsTrosakOpen(false)}
                        onSuccess={() => {
                            fetchTroskovi();
                        }}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default KalendarModal;