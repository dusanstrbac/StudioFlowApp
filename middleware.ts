import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("AuthToken")?.value;
    const { pathname, origin } = req.nextUrl; // Uzimamo origin (npr. http://93.87.226.214:3000)

    const isPublicPage = pathname === "/login" || pathname === "/reset-password";

    if (!token && !isPublicPage) {
        // Koristimo origin da budemo sigurni da port ostaje isti
        return NextResponse.redirect(`${origin}/login`);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};