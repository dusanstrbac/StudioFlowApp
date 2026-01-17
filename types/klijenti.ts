export interface Client {
  name: string;
  service: string;
  time: string;
  price: number;
  id: number;
  napomena: string;
  telefon: string;
}

interface Expense {
  id: number;
  description: string; // npr. "Nabavka šampona"
  category: string;    // npr. "Materijal" ili "Faktura"
  amount: number;
  time: string;
}