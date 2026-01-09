'use client';
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Ikonice za strelice
import KalendarModal from './KalendarModal';
import { FirmaAsortimanDTO } from '@/types/firma';

interface KalendarProps {
  asortiman: FirmaAsortimanDTO[];
  onDateSelect?: (date: Date) => void;
  onTerminZakazan?: () => void;
}

// Helper funkcije za rad sa datumima
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 0);
  return date.getDate();
};

const getStartDayOfMonth = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  return date.getDay(); // Vraća dan u nedelji kada mesec počinje (0 - Nedelja, 1 - Ponedeljak...)
};

const getEndDayOfMonth = (year: number, month: number) => {
  const date = new Date(year, month, 0);
  return date.getDay(); // Vraća dan u nedelji kada mesec završava (0 - Nedelja, 1 - Ponedeljak...)
};

const months = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const fullWeekDays = [
  'Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'
];

const Kalendar = ({asortiman, onDateSelect, onTerminZakazan} : KalendarProps) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);  // Selektovani datum
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // Trenutni mesec
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear()); // Trenutna godina
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Da li je modal otvoren
  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false); // Da li je dropdown otvoren
  const [tempMonth, setTempMonth] = useState<number>(currentMonth); // Koristi se za odabir meseca u modalu
  const [tempYear, setTempYear] = useState<number>(currentYear); // Koristi se za odabir godine u modalu

  const daysInMonth = getDaysInMonth(currentYear, currentMonth + 1);
  const startDay = getStartDayOfMonth(currentYear, currentMonth + 1); // Dan početka meseca
  const endDay = getEndDayOfMonth(currentYear, currentMonth + 1); // Dan završetka meseca

  const handleDayClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);

    if (onDateSelect) {
      onDateSelect(clickedDate);
    }

    if (month !== currentMonth) {
      setCurrentMonth(month);
      setCurrentYear(year);
    }
  };

  const handleDayDoubleClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);  // Postavljanje selektovanog datuma
    setIsModalOpen(true); // Otvori modal kada se dvaput klikne na dan

    // Ako je kliknuti dan iz drugog meseca, menjamo mesec
    if (month !== currentMonth) {
      setCurrentMonth(month);
      setCurrentYear(year);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1); // Ako je januar, prebacujemo na decembar prošle godine
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1); // Ako je decembar, prebacujemo na januar sledeće godine
    } else {
      setCurrentMonth(currentMonth + 1);
    }
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

    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = prevMonthDays - startDay + i + 1;
      // Pravilno računanje godine i meseca za prethodni mesec
      const d = new Date(currentYear, currentMonth - 1, prevMonthDay);
      days.push(
        <button
          key={`prev-${i}`}
          onClick={() => handleDayClick(d.getDate(), d.getMonth(), d.getFullYear())}
          onDoubleClick={() => handleDayDoubleClick(d.getDate(), d.getMonth(), d.getFullYear())}
          className="relative w-full h-24 flex items-center justify-center cursor-pointer border rounded-lg bg-gray-100 opacity-60"
        >
          <span className="absolute top-2 right-2 text-sm font-semibold text-gray-400">{prevMonthDay}</span>
        </button>
      );
    }

    // Dodajemo stvarne dane meseca
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate?.getDate() === day && selectedDate.getMonth() === currentMonth;
      const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear; // Da li je danasšnji dan

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day, currentMonth, currentYear)}
          onDoubleClick={() => handleDayDoubleClick(day, currentMonth, currentYear)}
          className={`relative w-full h-24 flex items-center justify-center cursor-pointer border rounded-lg overflow-hidden ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'} ${isToday ? 'border-2 border-red-500 text-red-500' : ''}`}>
          {/* Broj dana u gornjem desnom kutu */}
          <span className={`absolute top-2 right-2 text-sm font-semibold ${isToday ? 'text-red-500' : ''}`}>{day}</span>
        </button>
      );
    }

    // Dodajemo dane iz sledećeg meseca samo ako je poslednji dan meseca u petak ili pre
    const remainingCells = 7 - (endDay + 1);
      if (remainingCells > 0) {
        for (let i = 0; i < remainingCells; i++) {
          const nextMonthDay = i + 1;
          // Pravilno računanje godine i meseca za sledeći mesec
          const d = new Date(currentYear, currentMonth + 1, nextMonthDay);
          days.push(
            <button
              key={`next-${i}`}
              onClick={() => handleDayClick(d.getDate(), d.getMonth(), d.getFullYear())}
              onDoubleClick={() => handleDayDoubleClick(d.getDate(), d.getMonth(), d.getFullYear())}
              className="relative w-full h-24 flex items-center justify-center cursor-pointer border rounded-lg bg-gray-100 opacity-60"
            >
              <span className="absolute top-2 right-2 text-sm font-semibold text-gray-400">{nextMonthDay}</span>
            </button>
          );
        }
      }
      return days;
    };


  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 w-full bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div onClick={handlePreviousMonth} className="p-2 cursor-pointer text-xl text-gray-600 hover:bg-gray-100 rounded-full transition duration-300 ease-in-out">
          <ChevronLeft />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">{`${months[currentMonth]} ${currentYear}`}</span>
          <button onClick={toggleSelect} className="text-sm text-gray-600">
            {/* Prikazivanje ikone za otvaranje dropdown-a */}
            <span className='cursor-pointer'>&#9660;</span>
          </button>
        </div>

        <div onClick={handleNextMonth} className="p-2 cursor-pointer text-xl text-gray-600 hover:bg-gray-100 rounded-full transition duration-300 ease-in-out">
          <ChevronRight />
        </div>
      </div>

      {/* Dropdown za izbor meseca i godine */}
      {isSelectOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-16 bg-white shadow-2xl rounded-2xl p-6 w-[320px] z-50 border border-gray-100 animate-in fade-in zoom-in duration-200">
          <div className="space-y-6">
            {/* GODINA */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3 block">Godina</label>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1">
                <button 
                  onClick={() => setTempYear(prev => prev - 1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-lg text-gray-700">{tempYear}</span>
                <button 
                  onClick={() => setTempYear(prev => prev + 1)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* MESECI */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3 block">Mesec</label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setTempMonth(index)}
                    className={`py-2 text-sm font-medium rounded-xl transition-all ${
                      tempMonth === index 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {month.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* DUGME ZA POTVRDU */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsSelectOpen(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(tempMonth);
                  setCurrentYear(tempYear);
                  setIsSelectOpen(false);
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                Primeni
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mt-4">
        {/* Dan u nedelji */}
        {fullWeekDays.map((day, index) => (
          <div key={index} className="text-center font-semibold">{day}</div>
        ))}

        {/* Renderovanje dana */}
        {renderDays()}
      </div>

      {isModalOpen && selectedDate && (
        <KalendarModal 
          date={selectedDate} 
          onClose={closeModal} 
          asortiman={asortiman} 
          onTerminZakazan={onTerminZakazan} 
        />
      )}    
  </div>
  );
};

export default Kalendar;
