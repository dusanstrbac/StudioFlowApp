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

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Pogrešno korisničko ime ili lozinka.");
        }
        throw new Error("Greška prilikom slanja zahteva.");
      }

      const rezultat = await res.json();

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Prijava
        </h1>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Korisničko ime ili Email adresa
          </label>
          <input
            type="text"
            {...register("korisnickoIme")}
            placeholder="Unesite email..."
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.korisnickoIme
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
            }`}
          />
          {errors.korisnickoIme && (
            <p className="text-red-500 text-sm mt-1">
              {errors.korisnickoIme.message}
            </p>
          )}
        </div>

        <div className="mb-2">
          <label className="block text-gray-700 font-medium mb-2">
            Lozinka
          </label>
          <input
            type="password"
            {...register("lozinka")}
            placeholder="Unesite lozinku..."
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.lozinka
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
            }`}
          />
          {errors.lozinka && (
            <p className="text-red-500 text-sm mt-1">
              {errors.lozinka.message}
            </p>
          )}
        </div>

        <div className="text-right mb-6">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-sm text-blue-600 hover:text-blue-800 transition bg-transparent border-none cursor-pointer"
          >
            Zaboravili ste lozinku?
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all">
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
              <h2 className="text-xl font-bold mb-4">Resetovanje lozinke</h2>
              <p className="text-sm text-gray-600 mb-4">
                Unesite vašu email adresu i poslaćemo vam uputstvo za postavljanje nove lozinke.
              </p>
              
              <input
                type="email"
                placeholder="vass@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-300 outline-none"
              />
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetLozinke();
                  }}
                  disabled={isResetting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isResetting ? "Slanje..." : "Pošalji uputstvo"}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Prijavljujem se..." : "Prijavi se"}
        </button>

        {errorMessage && (
          <p className="text-red-600 text-center text-sm mt-4">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}