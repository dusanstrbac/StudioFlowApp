"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCookie, setCookie } from "cookies-next";
import { toast } from "sonner";
import { useRouter } from "next/navigation"; // Dodato za bolju navigaciju

const loginSchema = z.object({
  korisnickoIme: z.string().min(1, "Email ili korisničko ime je obavezno."),
  lozinka: z.string().min(3, "Lozinka mora imati najmanje 3 karaktera."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter(); // Inicijalizacija routera
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Auth/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      const rezultat = await res.json();
      console.log(rezultat);

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(rezultat.message);
        }
        throw new Error("Greška prilikom slanja zahteva.");
      }


      if (rezultat.token) {
        setCookie("AuthToken", rezultat.token, {
          maxAge: 60 * 60 * 24 * 5,
          path: "/",
          sameSite: "lax",
          // U produkciji je bolje ne koristiti encode: (value) => value 
          // osim ako backend specifično ne zahteva sirov string.
        });
        
        // Čuvamo i u localStorage ako ti je potrebno za non-HTTP klijente
        window.localStorage.setItem("AuthToken", rezultat.token);
      }

      const ruta = getCookie("poslednjaRuta");
      const redirectTo = typeof ruta === "string" && ruta.length > 0 ? ruta : "/";

      // Umesto window.location, koristimo router.push za SPA doživljaj
      // i router.refresh() da bi middleware prepoznao novi cookie
      router.push(redirectTo);
      router.refresh();

    } catch (error: unknown) {
      console.error("Greška prilikom logovanja:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Došlo je do greške. Pokušajte ponovo.");
      }
    }
  };

  const handleResetLozinke = async () => {
    if (!resetEmail.includes("@")) {
      toast.error("Molimo unesite ispravan email.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Sistem/reset-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetEmail), // Proveri da li backend očekuje samo string ili { email: resetEmail }
      });

      if (res.ok) {
        toast.success("Uputstvo za resetovanje lozinke je poslato na vaš email.");
        setIsModalOpen(false);
        setResetEmail("");
      } else {
        toast.error("Došlo je do greške. Pokušajte ponovo.");
      }
    } catch (error: unknown) { // FIKSIRANO: Umesto any koristimo unknown
      console.error("Reset password error:", error);
      toast.error("Greška u komunikaciji sa serverom.");
    } finally {
      setIsResetting(false);
    }
  };

return (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div className="w-full max-w-md space-y-8">
      <div className="bg-white py-8 px-6 shadow-none sm:shadow-xl rounded-none sm:rounded-2xl border-0 sm:border border-gray-100">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            StudioFlow
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Prijavite se na vaš nalog
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Polje za korisničko ime */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email ili korisničko ime
            </label>
            <input
              type="text"
              {...register("korisnickoIme")}
              placeholder="korisnik@email.com"
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:bg-white ${
                errors.korisnickoIme
                  ? "border-red-500 focus:ring-red-200"
                  : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
              }`}
            />
            {errors.korisnickoIme && (
              <p className="text-red-500 text-xs mt-1.5 ml-1 italic">
                {errors.korisnickoIme.message}
              </p>
            )}
          </div>

          {/* Polje za lozinku */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Lozinka
            </label>
            <input
              type="password"
              {...register("lozinka")}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:bg-white ${
                errors.lozinka
                  ? "border-red-500 focus:ring-red-200"
                  : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
              }`}
            />
            {errors.lozinka && (
              <p className="text-red-500 text-xs mt-1.5 ml-1 italic">
                {errors.lozinka.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Zaboravili ste lozinku?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? "Prijavljujem se..." : "Prijavi se"}
          </button>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-red-600 text-center text-sm font-medium">
                {errorMessage}
              </p>
            </div>
          )}
        </form>
      </div>
      
      {/* Dodatni info tekst van kartice */}
      <p className="text-center text-xs text-gray-400 mt-4">
        &copy; {new Date().getFullYear()} StudioFlow. Sva prava zadržana.
      </p>
    </div>

    {/* Modal - Poboljšan za mobilne */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsModalOpen(false)} 
        />
        <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
          <h2 className="text-xl font-bold text-gray-900">Reset lozinke</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Unesite email adresu kako biste dobili instrukcije.
          </p>
          
          <input
            type="email"
            placeholder="korisnik@email.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="mt-4 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
          />
          
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={handleResetLozinke}
              disabled={isResetting}
              className="w-full sm:flex-1 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition active:scale-[0.98] disabled:opacity-50"
            >
              {isResetting ? "Slanje..." : "Pošalji"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}