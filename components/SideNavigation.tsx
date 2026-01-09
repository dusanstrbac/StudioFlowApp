'use client';
import { useState, useEffect } from "react";
import { Building2, House, LibraryBig, Settings, User, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Button from "./ui/Button";
import { useRouter, usePathname } from "next/navigation";

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
    
    // Inicijalno je uvek false, a useEffect će pročitati pravu vrednost
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // 1. Čitanje iz storage-a samo jednom pri pokretanju
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    // 2. Handler sa "safety" mehanizmom za druge komponente
    const handleToggle = () => {
        setIsCollapsed(prev => {
            const nextValue = !prev;
            
            // Koristimo setTimeout(..., 0) da bismo izbegli konflikt u renderovanju
            // Ovo šalje signal KalendarModalu TEK KADA se završi render SideNavigation-a
            setTimeout(() => {
                localStorage.setItem('sidebar_collapsed', String(nextValue));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('sidebar_changed'));
                }
            }, 0);
            
            return nextValue;
        });
    };

    const aktivnaRuta = (route: string) => pathname === route;

    return (
        <>
            {/* MOBILNI HEADER */}
            <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-[60]">
                <h1 className="font-black text-blue-600">StudioFlow</h1>
                <button 
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 bg-gray-50 rounded-lg text-gray-600"
                >
                    {isMobileOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* OVERLAY */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[65] lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* SIDEBAR KONTEJNER */}
            <div 
                id="main-sidebar"
                className={`
                    fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-[70]
                    ${isMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'lg:w-[80px]' : 'lg:w-[240px]'}
                `}
            >
                <div className="flex flex-col h-full py-6 relative">
                    
                    {/* TOGGLE STRELICA */}
                    <button 
                        onClick={handleToggle}
                        className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm z-[80]"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    {/* Logo sekcija */}
                    <div className={`px-6 mb-10 transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                        <h1 className="text-xl font-black text-blue-600 whitespace-nowrap">
                            Studio<span className="text-gray-900">Flow</span>
                        </h1>
                    </div>

                    <div className="flex flex-col justify-between h-full px-3">
                        {/* Gornja grupa dugmića */}
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

                        {/* Donja grupa dugmića */}
                        <div className="flex flex-col gap-2">
                            {buttons.slice(2).map((button, index) => (
                                <Button
                                    key={index + 3}
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