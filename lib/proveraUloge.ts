import { KorisnikToken } from "./auth";

export function korisnikJeVlasnik(korisnik : KorisnikToken | null) : boolean {
 
    return korisnik?.uloga === "vlasnik";
}