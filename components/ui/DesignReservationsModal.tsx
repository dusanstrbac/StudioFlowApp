'use client';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ColorPicker } from "../ColorPicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DesignReservationModel = ({ isOpen, onClose }: Props) => {
  if (!isOpen) return null;

  const cases = [
    "Dani",
    "Vremena",
    "Usluge",
    "Podaci",
    "Potvrda",
  ];

  const [activeCase, setActiveCase] = useState(0);

  /* ---------------- BOJE ---------------- */

  // Dani
  const [openDayColor, setOpenDayColor] = useState("#22c55e");
  const [closedDayColor, setClosedDayColor] = useState("#6b7280");
  const [fullDayColor, setFullDayColor] = useState("#ef4444");
  const [brojeviUKalendaru, setBrojeviUKalendaru] = useState("#ffffff");

  // Vremena
  const [freeSlotColor, setFreeSlotColor] = useState("#3b82f6");
  const [busySlotColor, setBusySlotColor] = useState("#ef4444");

  // Usluge – stil dugmeta
  const [serviceBoxColor, setServiceBoxColor] = useState("#3b82f6");
  const [serviceTextColor, setServiceTextColor] = useState("#ffffff");

  /* ---------------- KALENDAR LOGIKA ---------------- */

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januar","Februar","Mart","April","Maj","Jun",
    "Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"
  ];

  const daysOfWeek = ["Pon","Uto","Sre","Čet","Pet","Sub","Ned"];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex =
    (new Date(year, month, 1).getDay() + 6) % 7;

  const prevMonth = () =>
    setCurrentDate(new Date(year, month - 1, 1));

  const nextMonth = () =>
    setCurrentDate(new Date(year, month + 1, 1));

  /* ---------------- WIZARD ---------------- */

  const nextStep = () => {
    if (activeCase < cases.length - 1)
      setActiveCase((prev) => prev + 1);
  };

  const prevStep = () => {
    if (activeCase > 0)
      setActiveCase((prev) => prev - 1);
  };

  /* ---------------- SETTINGS ---------------- */

  const renderSettings = () => {
    if (activeCase === 0) {
      return (
        <>
          <h2 className="text-lg font-bold mb-6">
            Boje dana u kalendaru
          </h2>

          <ColorPicker
            label="Otvoren dan"
            value={openDayColor}
            setValue={setOpenDayColor}
          />

          <ColorPicker
            label="Zatvoren dan"
            value={closedDayColor}
            setValue={setClosedDayColor}
          />

          <ColorPicker
            label="Prebukiran dan"
            value={fullDayColor}
            setValue={setFullDayColor}
          />

          <ColorPicker
            label="Brojevi u kalendaru"
            value={brojeviUKalendaru}
            setValue={setBrojeviUKalendaru}
          />
        </>
      );
    }

    if (activeCase === 1) {
      return (
        <>
          <h2 className="text-lg font-bold mb-6">
            Boje termina
          </h2>

          <ColorPicker
            label="Slobodan termin"
            value={freeSlotColor}
            setValue={setFreeSlotColor}
          />

          <ColorPicker
            label="Zauzet termin"
            value={busySlotColor}
            setValue={setBusySlotColor}
          />
        </>
      );
    }

    if (activeCase === 2) {
      return (
        <>
          <h2 className="text-lg font-bold mb-6">
            Stil dugmeta usluge
          </h2>
          <p className="text-sm font-semibold mb-3">Boja box-a</p>
          <ColorPicker value={serviceBoxColor} setValue={setServiceBoxColor} />

          <p className="text-sm font-semibold mb-3 mt-4">Boja teksta</p>
          <ColorPicker value={serviceTextColor} setValue={setServiceTextColor} />
        </>
      );
    }

    return (
      <h2 className="text-lg font-bold">
        Podešavanja – {cases[activeCase]}
      </h2>
    );
  };

  /* ---------------- PREVIEW ---------------- */

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={"empty-" + i} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      let color = openDayColor;

      if (day % 7 === 0) color = closedDayColor;
      if (day % 5 === 0) color = fullDayColor;

      days.push(
        <div
          key={day}
          className="h-10 flex items-center justify-center rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: color, color: brojeviUKalendaru}}
        >
          {day}
        </div>
      );
    }

    return (
      <>
        <CalendarHeader
          monthNames={monthNames}
          month={month}
          year={year}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
        />

        <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </>
    );
  };

  const renderTimeSlots = () => {
    const slots = [
      "09:00","09:30","10:00","10:30",
      "11:00","11:30","12:00","12:30"
    ];

    return (
      <div className="grid grid-cols-2 gap-3">
        {slots.map((time, i) => {
          const isFree = i % 3 !== 0;

          return (
            <div
              key={time}
              className="py-2 rounded-xl text-white text-center font-semibold"
              style={{
                backgroundColor: isFree
                  ? freeSlotColor
                  : busySlotColor,
              }}
            >
              {time}
            </div>
          );
        })}
      </div>
    );
  };

  const renderServices = () => {
    const sampleServices = [
      "Frizura",
      "Manikir",
      "Masaža",
      "Šminkanje"
    ];

    return (
      <div className="grid grid-cols-2 gap-3">
        {sampleServices.map((service, i) => (
          <div
            key={i}
            className="py-3 text-center font-semibold cursor-pointer"
            style={{
              backgroundColor: serviceBoxColor,
              color: serviceTextColor,
              borderRadius: 0 // oštre ivice
            }}
          >
            {service}
          </div>
        ))}
      </div>
    );
  };

  const renderPreview = () => {
    switch (activeCase) {
      case 0:
        return renderCalendarDays();
      case 1:
        return renderTimeSlots();
      case 2:
        return renderServices();
      case 3:
        return <input className="w-full p-2 border rounded-lg" placeholder="Ime i prezime" />;
      case 4:
        return <div className="text-center">🎉 Uspešna rezervacija</div>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <motion.div
        className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* HEADER */}
        <div className="border-b px-8 py-6 flex flex-col items-center gap-3">
          <div className="flex gap-3">
            {cases.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveCase(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeCase === index
                    ? "w-8 bg-blue-600"
                    : "w-2.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-gray-600">
            {cases[activeCase]}
          </p>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r p-8 overflow-y-auto">
            {renderSettings()}
          </div>

          <div className="w-1/2 flex items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCase}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderPreview()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t px-8 py-5 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold"
          >
            Otkaži
          </button>

          <div className="flex gap-3">
            {activeCase > 0 && (
              <button
                onClick={prevStep}
                className="px-6 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold"
              >
                Nazad
              </button>
            )}

            {activeCase < cases.length - 1 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold"
              >
                Dalje
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 font-semibold"
              >
                Sačuvaj
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ---------------- POMOĆNE KOMPONENTE ---------------- */

const CalendarHeader = ({ monthNames, month, year, prevMonth, nextMonth }: any) => (
  <div className="flex justify-between items-center mb-4">
    <button onClick={prevMonth} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">
      ←
    </button>
    <span className="font-semibold">
      {monthNames[month]} {year}
    </span>
    <button onClick={nextMonth} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">
      →
    </button>
  </div>
);

export default DesignReservationModel;