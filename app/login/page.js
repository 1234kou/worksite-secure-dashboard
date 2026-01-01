"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  {
    email: "dg@worksite.demo",
    password: "demo",
    role: "dg",
    name: "Directeur Général",
  },
  {
    email: "direction@worksite.demo",
    password: "demo",
    role: "direction",
    name: "Directeur Travaux",
  },
  {
    email: "chef@worksite.demo",
    password: "demo",
    role: "chef",
    name: "Chef de Chantier",
  },
  {
    email: "securite@worksite.demo",
    password: "demo",
    role: "securite",
    name: "Responsable Sécurité",
  },
  {
    email: "admin@worksite.demo",
    password: "demo",
    role: "admin",
    name: "Administrateur",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dg@worksite.demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si déjà connecté → on redirige vers la page principale
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("ws-user");
      if (stored) {
        router.push("/");
      }
    }
  }, [router]);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const found = DEMO_USERS.find(
      (u) => u.email === email.trim() && u.password === password.trim()
    );

    if (!found) {
      setError("Identifiants incorrects. Utilise un des comptes de démo.");
      return;
    }

    // On enregistre l'utilisateur dans localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "ws-user",
        JSON.stringify({
          email: found.email,
          role: found.role,
          name: found.name,
        })
      );
    }

    // Redirection selon le rôle
    switch (found.role) {
      case "dg":
        router.push("/");
        break;
      case "direction":
        router.push("/direction");
        break;
      case "chef":
        router.push("/chef-chantier");
        break;
      case "securite":
        router.push("/securite");
        break;
      case "admin":
        router.push("/admin");
        break;
      default:
        router.push("/");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/60">
        <h1 className="text-xl font-semibold mb-1">
          Worksite Secure —{" "}
          <span className="text-emerald-300">Connexion</span>
        </h1>
        <p className="text-xs text-slate-400 mb-4">
          Démo : utilise un des comptes ci-dessous. Mot de passe pour tous :
          <span className="font-mono ml-1 text-slate-200">demo</span>
        </p>

        <ul className="text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-4 space-y-1">
          <li>DG : dg@worksite.demo</li>
          <li>Direction Travaux : direction@worksite.demo</li>
          <li>Chef de Chantier : chef@worksite.demo</li>
          <li>Responsable Sécurité : securite@worksite.demo</li>
          <li>Administration : admin@worksite.demo</li>
        </ul>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-200">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-200">Mot de passe</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
