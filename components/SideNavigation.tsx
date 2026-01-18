'use client';
import { useState, useEffect } from "react";
import { Building2, House, LibraryBig, Settings, User, ChevronLeft, ChevronRight, Menu, X, Store } from "lucide-react";
import Button from "./ui/Button";
import { useRouter, usePathname } from "next/navigation";
import { dajKorisnikaIzTokena, KorisnikToken } from "@/lib/auth";
import { getCookie } from "cookies-next";
import { Lokacije } from "@/types/firma";
import { korisnikJeVlasnik } from "@/lib/proveraUloge";

const buttons = [
    { title: "Početna", icon: <House size={20} />, action: () => '/', buttonType: "pocetna" as const },
    { title: "Izvodi", icon: <LibraryBig size={20} />, action: () => '/izvodi', buttonType: "izvodi" as const },
    { title: "Salon", icon: <Building2 size={20} />, action: () => '/salon', buttonType: "salon" as const },
    { title: "Podešavanja", icon: <Settings size={20} />, action: () => '/podesavanja', buttonType: "podesavanja" as const },
    { title: "Nalog", icon: <User size={20} />, action: () => '/profil', buttonType: "nalog" as const }
];

const SideNavigation = () => {
    const router = useRouter();
    const pathname = usePathname();
    
    // State-ovi
    const [isMounted, setIsMounted] = useState(false);
    const [korisnik, setKorisnik] = useState<KorisnikToken | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [salons, setSalons] = useState<Lokacije[]>([]);
    const [selectedSalonId, setSelectedSalonId] = useState<string>("");

    useEffect(() => {
        setIsMounted(true);
        const trenutniKorisnik = dajKorisnikaIzTokena();
        setKorisnik(trenutniKorisnik);

        const savedSidebar = localStorage.getItem('sidebar_collapsed');
        if (savedSidebar !== null) setIsCollapsed(savedSidebar === 'true');

        const fetchSalons = async () => {
            if (!trenutniKorisnik?.idFirme) return;
            
            try {
                const token = getCookie("AuthToken");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Firme/DajFirme?idFirme=${trenutniKorisnik.idFirme}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                
                if (data && data[0]?.lokacije) {
                    const sveLokacije = data[0].lokacije;
                    setSalons(sveLokacije);

                    // --- LOGIKA ZA MEMORIJU ---
                    const memorisanaLokacija = localStorage.getItem('active_salon_id');
                    
                    if (korisnikJeVlasnik(trenutniKorisnik)) {
                        // VLASNIK: 
                        // Ako već ima nešto u memoriji, koristi to. 
                        // Ako nema, postavi prvu lokaciju iz niza i upiši u memoriju.
                        if (memorisanaLokacija) {
                            setSelectedSalonId(memorisanaLokacija);
                        } else {
                            const defaultId = String(sveLokacije[0].id);
                            setSelectedSalonId(defaultId);
                            localStorage.setItem('active_salon_id', defaultId);
                        }
                    } else {
                        // RADNIK / ZAPOSLENI:
                        // Uvek koristi ID lokacije koji mu je dodeljen u bazi (iz tokena)
                        // Time sprečavamo da radnik "slučajno" vidi kalendar drugog salona
                        const fiksniId = String(trenutniKorisnik.idLokacije);
                        setSelectedSalonId(fiksniId);
                        localStorage.setItem('active_salon_id', fiksniId);
                    }
                    
                    // Obaveštavamo ostale komponente da je ID spreman
                    window.dispatchEvent(new Event('salon_changed'));
                }
            } catch (error) {
                console.error('Greška pri učitavanju salona:', error);
            }
        };

        fetchSalons();
    }, []);

    const handleSalonChange = (id: string) => {
        setSelectedSalonId(id);
        localStorage.setItem('active_salon_id', id);
        window.dispatchEvent(new Event('salon_changed'));
    };

    const handleToggle = () => {
        const nextValue = !isCollapsed;
        setIsCollapsed(nextValue);
        localStorage.setItem('sidebar_collapsed', String(nextValue));
        window.dispatchEvent(new Event('sidebar_changed'));
    };

    const aktivnaRuta = (route: string) => pathname === route;

    // SPREČAVANJE HYDRATION ERROR-A
    // Dok se ne montira na klijentu, ne renderujemo ništa ili renderujemo osnovni placeholder
    if (!isMounted) {
        return <div className="hidden lg:block w-20 h-screen bg-white border-r border-gray-100" />;
    }

    return (
        <>
            {/* MOBILNI HEADER */}
            <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-60">
                <h1 className="font-black text-blue-600">StudioFlow</h1>
                <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 bg-gray-50 rounded-lg text-gray-600">
                    {isMobileOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* OVERLAY */}
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-65 lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* SIDEBAR KONTEJNER */}
            <div 
                id="main-sidebar"
                className={`
                    fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-70
                    ${isMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'lg:w-[80px]' : 'lg:w-[240px]'}
                `}
            >
                <div className="flex flex-col h-full py-6 relative">
                    
                    {/* TOGGLE STRELICA */}
                    <button onClick={handleToggle} className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm z-[80]">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    {/* Logo sekcija */}
                    <div className={`px-6 mb-8 transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                        <h1 className="text-xl font-black text-blue-600 whitespace-nowrap">
                            Studio<span className="text-gray-900">Flow</span>
                        </h1>
                    </div>

                    {/* Salon selektor - Provera uloge tek kad imamo korisnika */}
                    {korisnik && korisnikJeVlasnik(korisnik) && (
                        <div className={`px-3 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
                            <div className={`relative flex items-center bg-gray-50 border border-gray-200 rounded-xl p-2 group hover:border-blue-300 transition-all ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full gap-3'}`}>
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0">
                                    <Store size={isCollapsed ? 20 : 18} />
                                </div>
                                
                                {!isCollapsed && (
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aktivni lokal</span>
                                        <select 
                                            value={selectedSalonId}
                                            onChange={(e) => handleSalonChange(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer appearance-none truncate"
                                        >
                                            {salons.map(s => (
                                                <option key={s.id} value={s.id}>{s.nazivLokacije}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col justify-between h-full px-3">
                        <div className="flex flex-col gap-2">
                            {buttons.slice(0, 2).map((button, index) => (
                                <Button
                                    key={index}
                                    title={isCollapsed ? "" : button.title}
                                    icon={button.icon}
                                    buttonType={button.buttonType}
                                    className={`
                                        ${aktivnaRuta(button.action()) ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}
                                        ${isCollapsed ? 'justify-center !px-0' : 'justify-start px-4'}
                                        !transition-all !duration-200 !h-12 !rounded-xl w-full
                                    `}
                                    action={() => {
                                        router.push(button.action());
                                        setIsMobileOpen(false);
                                    }}
                                    isActive={aktivnaRuta(button.action())}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            {buttons.slice(2).map((button, index) => (
                                <Button
                                    key={index + 2}
                                    title={isCollapsed ? "" : button.title}
                                    icon={button.icon}
                                    buttonType={button.buttonType}
                                    className={`
                                        ${aktivnaRuta(button.action()) ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}
                                        ${isCollapsed ? 'justify-center !px-0' : 'justify-start px-4'}
                                        !transition-all !duration-200 !h-12 !rounded-xl w-full
                                    `}
                                    action={() => {
                                        router.push(button.action());
                                        setIsMobileOpen(false);
                                    }}
                                    isActive={aktivnaRuta(button.action())}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SideNavigation;