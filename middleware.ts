import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("AuthToken")?.value;
    const { pathname } = req.nextUrl;

    // Definišemo javne rute koje NE zahtevaju token
    const isPublicPage = pathname === "/login" || pathname === "/reset-password";

    if (!token && !isPublicPage) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    // Ovde koristimo matcher da preskočimo statičke fajlove i API rute
    // ali samu logiku provere radimo unutar middleware funkcije iznad
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};