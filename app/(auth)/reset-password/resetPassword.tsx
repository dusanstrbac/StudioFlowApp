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
        toast.success("Lozinka je uspešno promenjena!");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Greška prilikom promene lozinke.");
      }
    } catch (error: unknown) {
      console.error("Reset error:", error);
      toast.error("Greška u komunikaciji sa serverom.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI za nevalidan token - stilizovan kao i ostatak aplikacije
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link nije validan</h2>
          <p className="text-gray-600 mb-6">Link za resetovanje lozinke je istekao ili je neispravan.</p>
          <button 
            onClick={() => router.push("/login")}
            className="w-full py-2 bg-gray-800 text-white rounded-xl font-medium"
          >
            Nazad na prijavu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Na mobilnom (ispod sm) skidamo shadow i border radi čistijeg izgleda */}
        <div className="bg-white py-8 px-6 shadow-none sm:shadow-xl rounded-none sm:rounded-2xl border-0 sm:border border-gray-100 transition-all">
          
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Nova lozinka
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Unesite i potvrdite vašu novu lozinku za StudioFlow.
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova lozinka</label>
              <input
                type="password"
                {...register("novaLozinka")}
                placeholder="Najmanje 6 karaktera"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:bg-white ${
                  errors.novaLozinka 
                    ? "border-red-500 focus:ring-red-100" 
                    : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {errors.novaLozinka && (
                <p className="text-red-500 text-xs mt-1.5 ml-1 italic">{errors.novaLozinka.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Potvrdite lozinku</label>
              <input
                type="password"
                {...register("potvrdaLozinke")}
                placeholder="Ponovite lozinku"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:bg-white ${
                  errors.potvrdaLozinke 
                    ? "border-red-500 focus:ring-red-100" 
                    : "border-gray-200 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {errors.potvrdaLozinke && (
                <p className="text-red-500 text-xs mt-1.5 ml-1 italic">{errors.potvrdaLozinke.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                   {/* Opciono: ovde može ići mali spinner icon */}
                   Čuvanje...
                </span>
              ) : "Sačuvaj novu lozinku"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}