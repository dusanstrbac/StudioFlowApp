import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("AuthToken")?.value;
    const { pathname } = req.nextUrl;

    const isPublicPage = pathname === "/login" || pathname === "/reset-password";

    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            const isExpired = payload.exp * 1000 < Date.now();

            if (isExpired) {
                // Ako je istekao, brise se cookie i saljemo se korisnik na login
                const response = NextResponse.redirect(new URL("/login", req.url));
                response.cookies.delete("AuthToken");
                return response;
            }

            // Ako korisnik pokusa da ode na login a ima vazeci token vraca ga na dashboard
            if (isPublicPage) {
                return NextResponse.redirect(new URL("/", req.url));
            }
        } catch (e) {
            // Ako je token nevalidan ili ostecen
            const response = NextResponse.redirect(new URL("/login", req.url));
            response.cookies.delete("AuthToken");
            return response;
        }
    } else {
        // Ako nema tokena uopste
        if (!isPublicPage) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};