export interface Client {
  name: string;
  service: string;
  time: string;
  price: number;
  id: number;
}

interface Expense {
  id: number;
  description: string; // npr. "Nabavka šampona"
  category: string;    // npr. "Materijal" ili "Faktura"
  amount: number;
  time: string;
}