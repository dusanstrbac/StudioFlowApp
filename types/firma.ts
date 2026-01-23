export interface Firma {
    id: number | null;
    naziv: string;
    adresa: string;
    telefon: string;
    email: string; // Glavni email firme
    pib: string;
    maticniBroj: string;
    lokacije: Lokacije[];
}

export interface Lokacije {
    id: number;
    idFirme: number;
    nazivLokacije: string;
    adresa: string;
    telefon: string;
    email: string;
    zaposleni: Zaposleni[];
}

export interface Zaposleni {
    id: number;
    ime: string;
    telefon: string;
    email: string;
    uloga: string;
    adresaStanovanja: string;
    statusRada: string;
    datumKreiranja: string;
}

export interface FirmaAsortimanDTO {
    id: number;
    idFirme: number;
    idLokacije: number;
    idKategorije: number;
    idUsluge: number;
    cena: number;
    nazivUsluge: string;
    nazivKategorije: string;
}

export interface FirmaInventarDTO {
    id: number;
    idFirme: number;
    idLokacije: number;
    idKategorije: number;
    nazivProizvoda: string;
    trenutnaKolicina: number;
    minKolicina: number;
    datumPoslednjeNabavke: string;
    nazivKategorije: string;
}

export interface Termin {
    id?: number;
    idFirme?: number;
    idLokacije?: number;
    idUsluge?: number;
    idZaposlenog?: number;
    datumTermina: string;
    cena: number;
    imeMusterije: string;
    nazivUsluge?: string;
}