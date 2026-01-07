import { jwtDecode } from "jwt-decode"; // bez {} ako koristiš default export
import { getCookie } from "cookies-next";

type DekodiranToken = {
  sub: string;        // korisničko ime
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  ime: string;
  idKorisnika: string;
  email: string;
  telefon: string;
  idFirme: string;
  idLokacije: string;
  jti: string;        // jedinstveni id tokena
  exp: number;        // unix timestamp
  iss: string;
  aud: string;
};

export type KorisnikToken = {
  korisnickoIme: string;
  idKorisnika: string;
  uloga: string;
  ime: string;
  email: string;
  telefon: string;
  idFirme: string;
  idLokacije: string;
  tokenIstice: Date | null;
};

export function dajKorisnikaIzTokena(token?: string): KorisnikToken | null {
  const t = token || getCookie("AuthToken");
  if (!t || typeof t !== "string") return null;

  try {
    const decoded = jwtDecode<DekodiranToken>(t); // default import
    return {
      korisnickoIme: decoded.sub,
      uloga: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      idKorisnika: decoded.idKorisnika,
      ime: decoded.ime,
      email: decoded.email,
      telefon: decoded.telefon,
      idFirme: decoded.idFirme,
      idLokacije: decoded.idLokacije,
      tokenIstice: decoded.exp ? new Date(decoded.exp * 1000) : null,
    };
  } catch (error) {
    console.error("Greška pri dekodiranju tokena:", error);
    return null;
  }
}
