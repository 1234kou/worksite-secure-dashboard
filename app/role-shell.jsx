"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ROLE_LABELS = {
  dg: "Directeur Général",
  direction: "Direction Travaux",
  chef: "Chef de Chantier",
  securite: "Responsable Sécurité",
  admin: "Administration",
};

// 1 seule route par rôle
const ROUTE_REQUIRED_ROLE = {
  "/": ["dg"],                 // Vue DG
  "/direction": ["direction"], // Vue Direction Travaux
  "/chef-chantier": ["chef"],  // Vue Chef de Chantier
  "/securite": ["securite"],   // Vue Responsable Sécurité
  "/admin": ["admin"],         // Vue Administration
};

// Liens visibles dans la barre du haut selon le rôle
const NAV_LINKS_BY_ROLE = {
  dg: [{ label: "Vue DG", path: "/" }],
  direction: [{ label: "Direction Travaux", path: "/direction" }],
  chef: [{ label: "Chef de Chantier", path: "/chef-chantier" }],
  securite: [{ label: "Responsable Sécurité", path: "/securite" }],
  admin: [{ label: "Administration", path: "/admin" }],
};

function startsWithRoute(pathname, routeBase) {
  if (routeBase === "/") return pathname === "/";
  return pathname === routeBase || pathname.startsWith(routeBase + "/");
}

export default function RoleShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("ws-user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erreur lecture ws-user:", e);
    } finally {
      setReady(true);
    }
  }, []);

  // Déconnexion
  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ws-user");
    }
    setUser(null);
    router.push("/login");
  }

  // Pendant le chargement
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Chargement interface Worksite Secure…
      </div>
    );
  }

  // Page /login : pas de shell
  if (pathname === "/login") {
    return children;
  }

  // Calcul des droits sur la route courante
  let accessDenied = false;
  let requiredRoles = [];

  if (pathname) {
    for (const [routeBase, allowedRoles] of Object.entries(
      ROUTE_REQUIRED_ROLE
    )) {
      if (startsWithRoute(pathname, routeBase)) {
        requiredRoles = allowedRoles;
        if (!user || !allowedRoles.includes(user.role)) {
          accessDenied = true;
        }
        break;
      }
    }
  }

  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : "Non connecté";

  // Récupérer les liens de navigation autorisés pour ce rôle
  const navLinks = user ? NAV_LINKS_BY_ROLE[user.role] || [] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-500/90 text-slate-950 font-semibold flex items-center justify-center text-[13px]">
              WS
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-100">
                Worksite Secure
              </span>
              <span className="text-[11px] text-slate-500">
                Pilotage sécurité multi-sites
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-[11px] text-slate-400">
                {user ? "Connecté en :" : "Non connecté"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-200">
                {roleLabel}
              </span>
            </div>

            {user ? (
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Se déconnecter
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Aller à la connexion
              </button>
            )}
          </div>
        </div>

        {/* Liens rapides : seulement ceux autorisés pour ce rôle */}
        <nav className="mx-auto max-w-7xl px-4 pb-2 text-[11px] text-slate-400 flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 hover:bg-slate-800"
            >
              {link.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Alerte d'accès refusé */}
      {accessDenied && (
        <div className="mx-auto mt-3 max-w-7xl px-4">
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            <div className="font-semibold mb-1">Accès restreint.</div>
            <div>
              Cette vue est réservée aux rôles :{" "}
              <span className="font-semibold">
                {requiredRoles.map((r) => ROLE_LABELS[r] || r).join(" / ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1">{!accessDenied && children}</div>
    </div>
  );
}
