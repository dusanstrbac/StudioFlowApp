'use client';
import { Building2, House, LibraryBig, Settings, User } from "lucide-react";
import Button from "./ui/Button";
import { useRouter, usePathname } from "next/navigation";

const buttons = [
    {
        title: "Početna",
        icon: <House />,
        action: () => '/',
        buttonType: "pocetna" as const
    },
    // {
    //     title: "Mušterije",
    //     icon: <Users />,
    //     action: () => '/musterije',
    //     buttonType: "musterije" as const
    // },
    {
        title: "Izvodi",
        icon: <LibraryBig />,
        action: () => '/izvodi',
        buttonType: "izvodi" as const
    },
    {
        title: "Salon",
        icon: <Building2 />,
        action: () => '/salon',
        buttonType: "salon" as const
    },
    {
        title: "Podešavanja",
        icon: <Settings />,
        action: () => '/podesavanja',
        buttonType: "podesavanja" as const
    },
    {
        title: "Nalog",
        icon: <User />,
        action: () => '/profil',
        buttonType: "nalog" as const
    }
];

const SideNavigation = () => {
    const router = useRouter();
    const pathname = usePathname();
    const aktivnaRuta = (route: string) => pathname === route;  // Provera aktivne rute

    return (
        <div className="px-4 py-6 border-r border-gray-400 h-full w-[220px] text-center bg-white shadow-md">
            <div className="flex flex-col justify-between h-full">
                <div className="flex flex-col gap-4">
                    {buttons.slice(0, 2).map((button, index) => (
                        <Button
                            key={index}
                            title={button.title}
                            icon={button.icon}
                            buttonType={button.buttonType}
                            className={aktivnaRuta(button.action()) ? 'bg-blue-500 text-white' : ''}
                            action={() => router.push(button.action())}
                            isActive={aktivnaRuta(button.action())}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    {buttons.slice(2).map((button, index) => (
                        <Button
                            key={index + 3}
                            title={button.title}
                            icon={button.icon}
                            buttonType={button.buttonType}
                            className={aktivnaRuta(button.action()) ? 'bg-blue-500 text-white' : ''}
                            action={() => router.push(button.action())}
                            isActive={aktivnaRuta(button.action())}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SideNavigation;
