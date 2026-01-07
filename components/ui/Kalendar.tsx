'use client';
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import KalendarModal from './KalendarModal';
import { FirmaAsortimanDTO } from '@/types/firma';

interface KalendarProps {
  asortiman: FirmaAsortimanDTO[];
  mesecniTermini?: any[]; // Niz svih termina za trenutni mesec
  onDateSelect?: (date: Date) => void;
  onTerminZakazan?: () => void;
  onMonthChange?: (year: number, month: number) => void; // Okida fetch u page.tsx
}

// Helper funkcije
const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const getStartDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

const months = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const fullWeekDays = [
  'Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'
];

const Kalendar = ({ asortiman, mesecniTermini = [], onDateSelect, onTerminZakazan, onMonthChange }: KalendarProps) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false);
  const [tempMonth, setTempMonth] = useState<number>(currentMonth);
  const [tempYear, setTempYear] = useState<number>(currentYear);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth + 1);
  const startDay = getStartDayOfMonth(currentYear, currentMonth + 1);

  // Funkcija za promenu meseca/godine
  const updateMonth = (newMonth: number, newYear: number) => {
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    }
  };

  const handleDayClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    if (onDateSelect) onDateSelect(clickedDate);
    if (month !== currentMonth) updateMonth(month, year);
  };

  const handleDayDoubleClick = (day: number, month: number, year: number) => {
    handleDayClick(day, month, year);
    setIsModalOpen(true);
  };

  const toggleSelect = () => {
    if (!isSelectOpen) {
      setTempMonth(currentMonth);
      setTempYear(currentYear);
    }
    setIsSelectOpen(prev => !prev);
  };

  const renderDays = () => {
    const days = [];
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth);

    // 1. Dani iz prethodnog meseca
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = prevMonthDays - startDay + i + 1;
      days.push(
        <div key={`prev-${i}`} className="relative w-full h-24 border rounded-lg bg-gray-50 opacity-40 flex items-center justify-center">
          <span className="absolute top-2 right-2 text-xs font-semibold text-gray-400">{prevMonthDay}</span>
        </div>
      );
    }

    // 2. Glavni dani meseca
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate?.getDate() === day && 
                         selectedDate.getMonth() === currentMonth && 
                         selectedDate.getFullYear() === currentYear;
      const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

      // BROJANJE TERMINA
      const broj = mesecniTermini.filter(t => {
        const d = new Date(t.datumTermina);
        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day, currentMonth, currentYear)}
          onDoubleClick={() => handleDayDoubleClick(day, currentMonth, currentYear)}
          className={`relative w-full h-24 flex flex-col items-center justify-center cursor-pointer border rounded-lg transition-all duration-200 ${
            isSelected ? 'bg-blue-600 text-white shadow-lg z-10 scale-[1.02]' : 'hover:bg-blue-50 bg-white border-gray-100'
          } ${isToday ? 'border-2 border-red-500' : ''}`}
        >
          <span className={`absolute top-2 right-2 text-xs font-bold ${isToday && !isSelected ? 'text-red-500' : isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
            {day}
          </span>

          {broj > 0 && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <span className={`text-2xl font-black leading-none ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                {broj}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-tighter mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                {broj === 1 ? 'Termin' : 'Termina'}
              </span>
            </div>
          )}
        </button>
      );
    }

    // 3. Popunjavanje do kraja mreže (fiksno 42 polja)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="relative w-full h-24 border rounded-lg bg-gray-50 opacity-40 flex items-center justify-center">
          <span className="absolute top-2 right-2 text-xs font-semibold text-gray-400">{i}</span>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-4 w-full bg-white rounded-xl shadow-md relative">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => updateMonth(currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft />
        </button>

        <div className="flex items-center space-x-2 cursor-pointer group" onClick={toggleSelect}>
          <span className="text-xl font-bold group-hover:text-blue-600">{months[currentMonth]} {currentYear}</span>
          <span className="text-gray-400 group-hover:text-blue-600">▼</span>
        </div>

        <button onClick={() => updateMonth(currentMonth === 11 ? 0 : currentMonth + 1, currentMonth === 11 ? currentYear + 1 : currentYear)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight />
        </button>
      </div>

      {isSelectOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-16 bg-white shadow-2xl rounded-2xl p-6 w-[320px] z-50 border border-gray-100 animate-in fade-in zoom-in duration-200">
          <div className="space-y-6">
            <div>
              <label className="text-xs uppercase text-gray-400 font-bold mb-3 block">Godina</label>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1">
                <button onClick={() => setTempYear(prev => prev - 1)} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={18} /></button>
                <span className="font-bold text-lg">{tempYear}</span>
                <button onClick={() => setTempYear(prev => prev + 1)} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-400 font-bold mb-3 block">Mesec</label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m, idx) => (
                  <button key={idx} onClick={() => setTempMonth(idx)} className={`py-2 text-sm font-medium rounded-xl ${tempMonth === idx ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100'}`}>
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsSelectOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-semibold">Odustani</button>
              <button onClick={() => { updateMonth(tempMonth, tempYear); setIsSelectOpen(false); }} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-100">Primeni</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {fullWeekDays.map((day, idx) => (
          <div key={idx} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">{day.substring(0, 3)}</div>
        ))}
        {renderDays()}
      </div>

      {isModalOpen && selectedDate && (
        <KalendarModal date={selectedDate} onClose={() => setIsModalOpen(false)} asortiman={asortiman} onTerminZakazan={onTerminZakazan} />
      )}
    </div>
  );
};

export default Kalendar;