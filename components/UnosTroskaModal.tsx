'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, DollarSign, Tag, FileText, Receipt } from 'lucide-react';
import { dajKorisnikaIzTokena } from '@/lib/auth';
import { toast } from 'sonner';

interface UnosTroskaModalProps {
  onClose: () => void;
  date: string; // Očekuje format YYYY-MM-DD (sqlDate)
  onSuccess: () => void;
}

const UnosTroskaModal: React.FC<UnosTroskaModalProps> = ({ onClose, date, onSuccess }) => {
  const korisnik = dajKorisnikaIzTokena();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    opis: '',
    iznos: '',
    kategorija: 'Ostalo'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validacija
    if (!form.opis || !form.iznos) {
      toast.error("Molimo vas popunite opis i iznos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Zakazivanja/DodajTrosak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opis: form.opis,
          iznos: parseFloat(form.iznos),
          kategorija: form.kategorija,
          datum: date, // Šalje se sqlDate
          idFirme: korisnik?.idFirme,
          idLokacije: korisnik?.idLokacije
        })
      });

      if (response.ok) {
        toast.success("Trošak uspešno zabeležen");
        onSuccess(); // Osvežava listu u roditelju
        onClose();   // Zatvara modal
      } else {
        toast.error("Greška pri čuvanju na serveru.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Sistemska greška: Proverite konekciju sa API-jem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Receipt size={20} /> Novi Trošak / Faktura
          </h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform cursor-pointer">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Opis */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opis troška</label>
            <div className="relative mt-1">
              <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Npr. Nabavka materijala, Kirija..."
                value={form.opis}
                onChange={(e) => setForm({...form, opis: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Iznos */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Iznos (RSD)</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="number"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="0.00"
                  value={form.iznos}
                  onChange={(e) => setForm({...form, iznos: e.target.value})}
                />
              </div>
            </div>

            {/* Kategorija */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kategorija</label>
              <div className="relative mt-1">
                <Tag className="absolute left-3 top-3 text-gray-400" size={18} />
                <select 
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white appearance-none"
                  value={form.kategorija}
                  onChange={(e) => setForm({...form, kategorija: e.target.value})}
                >
                  <option value="Ostalo">Ostalo</option>
                  <option value="Materijal">Materijal</option>
                  <option value="Režije">Režije</option>
                  <option value="Kirija">Kirija</option>
                  <option value="Plate">Plate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 text-white py-3.5 rounded-lg font-bold hover:bg-red-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-red-200"
          >
            {loading ? (
              <span className="animate-pulse text-white">Slanje...</span>
            ) : (
              <><Save size={18} /> Snimi trošak</>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default UnosTroskaModal;