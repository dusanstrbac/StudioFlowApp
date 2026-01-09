"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const resetSchema = z.object({
  novaLozinka: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera."),
  potvrdaLozinke: z.string()
}).refine((data) => data.novaLozinka === data.potvrdaLozinke, {
  message: "Lozinke se ne podudaraju",
  path: ["potvrdaLozinke"],
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    if (!token) {
      toast.error("Token nedostaje ili je nevalidan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Sistem/complete-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          novaLozinka: data.novaLozinka,
        }),
      });

      if (res.ok) {
        toast.success("Lozinka je uspešno promenjena! Preusmeravamo vas na prijavu...");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        // Pokušavamo da izvučemo poruku o grešci sa servera, ako postoji
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Greška prilikom promene lozinke.");
      }
    } catch (error: unknown) { // FIKSIRANO: Umesto any koristimo unknown
      console.error("Reset error:", error);
      toast.error("Došlo je do greške u komunikaciji sa serverom.");
      
      // Umesto throw new Error, bolje je samo logovati jer smo već obavestili korisnika preko toast-a
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500 font-bold">Nevalidan link za resetovanje lozinke.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Postavite novu lozinku</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nova lozinka</label>
            <input
              type="password"
              {...register("novaLozinka")}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.novaLozinka ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-blue-300"
              }`}
            />
            {errors.novaLozinka && <p className="text-red-500 text-sm mt-1">{errors.novaLozinka.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Potvrdite lozinku</label>
            <input
              type="password"
              {...register("potvrdaLozinke")}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.potvrdaLozinke ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-blue-300"
              }`}
            />
            {errors.potvrdaLozinke && <p className="text-red-500 text-sm mt-1">{errors.potvrdaLozinke.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Čuvanje..." : "Sačuvaj novu lozinku"}
          </button>
        </form>
      </div>
    </div>
  );
}