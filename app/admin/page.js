"use client";

import { useEffect, useState, useMemo } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// --- Petites fonctions utilitaires ---

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// --- Données “maquettes” pour les utilisateurs & rôles ---

const MOCK_USERS = [
  {
    id: 1,
    name: "Koffi Jean",
    email: "jean.koffi@entreprise.ci",
    role: "DG",
    site: "Tous les sites",
    status: "Actif",
  },
  {
    id: 2,
    name: "Agnès Kouadio",
    email: "agnes.kouadio@entreprise.ci",
    role: "Direction Travaux",
    site: "Immeuble Plateau A",
    status: "Actif",
  },
  {
    id: 3,
    name: "Moussa Traoré",
    email: "moussa.traore@entreprise.ci",
    role: "Chef de chantier",
    site: "Chantier Zone Industrielle",
    status: "Actif",
  },
  {
    id: 4,
    name: "Sarah Konan",
    email: "sarah.konan@entreprise.ci",
    role: "Responsable Sécurité",
    site: "Tous les sites",
    status: "Actif",
  },
  {
    id: 5,
    name: "Stagiaire Sécurité",
    email: "stagiaire.hse@entreprise.ci",
    role: "Lecture seule",
    site: "Résidence Riviera Golf",
    status: "En validation",
  },
];

const ROLE_DEFINITIONS = [
  {
    name: "DG",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    description:
      "Vue globale groupe, décisions stratégiques, arbitrage budget / sécurité.",
    permissions: ["Lecture globale", "Validation finale des politiques", "Accès reporting exécutif"],
  },
  {
    name: "Direction Travaux",
    color: "bg-sky-500/10 text-sky-300 border-sky-500/40",
    description:
      "Pilotage des chantiers, arbitrage priorités opérationnelles, suivi risques.",
    permissions: ["Lecture globale chantiers", "Signalement incident", "Suivi plans d’actions"],
  },
  {
    name: "Chef de chantier",
    color: "bg-amber-500/10 text-amber-300 border-amber-500/40",
    description:
      "Responsable sécurité opérationnelle sur un chantier précis.",
    permissions: ["Déclaration incident", "Mise à jour statut incident", "Consultation tableau de bord chantier"],
  },
  {
    name: "Responsable Sécurité",
    color: "bg-rose-500/10 text-rose-300 border-rose-500/40",
    description:
      "Supervision HSE globale, animation des plans de prévention.",
    permissions: ["Analyse multi-sites", "Suivi indicateurs HSE", "Coordination des actions correctives"],
  },
  {
    name: "Lecture seule",
    color: "bg-slate-500/10 text-slate-300 border-slate-500/40",
    description:
      "Consultation uniquement, aucun impact sur les données.",
    permissions: ["Lecture tableaux de bord"],
  },
];

const SECURITY_PARAMS = {
  criticalThreshold: 1, // nombre maximal d’incidents critiques ouverts
  slaHoursCritical: 4,
  slaHoursMedium: 24,
  slaHoursMinor: 72,
  autoAlertsEnabled: true,
  weeklyReportEnabled: true,
};

// --- Composant principal ---

export default function AdminPage() {
  const [status, setStatus] = useState(null);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!API_BASE_URL) {
        setError(
          "API non configurée. Vérifiez NEXT_PUBLIC_API_BASE_URL dans votre fichier .env.local."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [statusRes, sitesRes, incidentsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/status`),
          fetch(`${API_BASE_URL}/sites`),
          fetch(`${API_BASE_URL}/incidents`),
        ]);

        if (!statusRes.ok || !sitesRes.ok || !incidentsRes.ok) {
          throw new Error("Erreur lors du chargement des données Worksite Secure.");
        }

        const [statusData, sitesData, incidentsData] = await Promise.all([
          statusRes.json(),
          sitesRes.json(),
          incidentsRes.json(),
        ]);

        setStatus(statusData);
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
        if (sitesData && sitesData.length > 0) {
          setSelectedSiteId(sitesData[0].id);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Erreur inconnue.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || null,
    [sites, selectedSiteId]
  );

  const criticalOpen = useMemo(
    () =>
      incidents.filter(
        (i) => i.severity === "Critique" && i.status !== "Résolu"
      ).length,
    [incidents]
  );

  const mediumOpen = useMemo(
    () =>
      incidents.filter(
        (i) => i.severity === "Moyen" && i.status !== "Résolu"
      ).length,
    [incidents]
  );

  const minorOpen = useMemo(
    () =>
      incidents.filter(
        (i) => i.severity === "Mineur" && i.status !== "Résolu"
      ).length,
    [incidents]
  );

  const totalUsers = MOCK_USERS.length;
  const activeUsers = MOCK_USERS.filter((u) => u.status === "Actif").length;

  const incidentBySite = useMemo(() => {
    const map = {};
    for (const inc of incidents) {
      const key = inc.site_id;
      if (!map[key]) {
        map[key] = { total: 0, critical: 0, medium: 0, minor: 0 };
      }
      map[key].total += 1;
      if (inc.severity === "Critique") map[key].critical += 1;
      if (inc.severity === "Moyen") map[key].medium += 1;
      if (inc.severity === "Mineur") map[key].minor += 1;
    }
    return map;
  }, [incidents]);

  const lastUpdate = status ? new Date().toISOString() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/20">
              WS
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold">
                Worksite Secure —{" "}
                <span className="text-emerald-300">Vue Administration</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Pilotage global des chantiers, utilisateurs, rôles et paramètres sécurité.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs md:text-sm">
            <div
              className={classNames(
                "px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-2",
                status && !error
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/50 bg-rose-500/10 text-rose-300"
              )}
            >
              <span
                className={classNames(
                  "h-2 w-2 rounded-full",
                  status && !error ? "bg-emerald-400" : "bg-rose-400"
                )}
              />
              {status && !error ? "Backend en ligne" : "Backend hors ligne"}
              {status?.version && (
                <span className="text-[10px] text-slate-400 ml-1">
                  — API v{status.version}
                </span>
              )}
            </div>
            <div className="hidden md:flex flex-col items-end text-[11px] text-slate-400">
              <span>Dernière mise à jour :</span>
              <span className="text-slate-300 font-medium">
                {formatDateTime(lastUpdate)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm flex items-start gap-2">
            <span className="mt-0.5 text-lg">⚠️</span>
            <div>
              <p className="font-medium">Erreur de connexion à Worksite Secure</p>
              <p className="text-rose-100/80">{error}</p>
            </div>
          </div>
        )}

        {/* Bandeau de synthèse */}
        <section className="grid md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">Chantiers</p>
              <span className="text-[11px] text-slate-500">Gestion</span>
            </div>
            <div className="text-2xl font-semibold text-emerald-300">
              {sites.length}
            </div>
            <p className="text-xs text-slate-400">
              Sites suivis dans Worksite Secure.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">Utilisateurs</p>
              <span className="text-[11px] text-slate-500">Accès</span>
            </div>
            <div className="text-2xl font-semibold text-sky-300">
              {totalUsers}
              <span className="ml-2 text-xs text-slate-400">
                {activeUsers} actif(s)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comptes créés dans la plateforme.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">Incidents ouverts</p>
              <span className="text-[11px] text-slate-500">HSE</span>
            </div>
            <div className="text-xl font-semibold text-amber-300">
              {criticalOpen + mediumOpen + minorOpen}
            </div>
            <p className="text-xs text-slate-400">
              Tous niveaux de gravité confondus.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">
                Paramètres sécurité
              </p>
              <span className="text-[11px] text-slate-500">Politiques</span>
            </div>
            <div className="text-sm text-slate-200">
              Seuil critique :{" "}
              <span className="font-semibold text-rose-300">
                {SECURITY_PARAMS.criticalThreshold} incident
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              SLA Critique : {SECURITY_PARAMS.slaHoursCritical}h — Moyen :{" "}
              {SECURITY_PARAMS.slaHoursMedium}h — Mineur :{" "}
              {SECURITY_PARAMS.slaHoursMinor}h
            </p>
          </div>
        </section>

        {/* 2 colonnes principales */}
        <section className="grid lg:grid-cols-3 gap-6">
          {/* Colonne de gauche : chantiers + utilisateurs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gestion des chantiers */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/40">
              <div className="border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Gestion des chantiers
                  </h2>
                  <p className="text-xs text-slate-400">
                    Suivi des sites surveillés par Worksite Secure.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button className="px-3 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800/80 transition">
                    + Ajouter un chantier (bientôt)
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {loading && (
                  <p className="text-xs text-slate-400">
                    Chargement des chantiers…
                  </p>
                )}

                {!loading && sites.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Aucun chantier configuré pour le moment.
                  </p>
                )}

                {!loading && sites.length > 0 && (
                  <div className="overflow-x-auto -mx-4">
                    <table className="min-w-full text-xs border-t border-slate-800">
                      <thead className="bg-slate-900/80">
                        <tr className="text-slate-400">
                          <th className="px-4 py-2 text-left font-medium">
                            Chantier
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Localisation
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Score risque
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Incidents
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Statut
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sites.map((site) => {
                          const stats = incidentBySite[site.id] || {
                            total: 0,
                            critical: 0,
                            medium: 0,
                            minor: 0,
                          };

                          const riskColor =
                            site.risk_score >= 70
                              ? "text-rose-300"
                              : site.risk_score >= 50
                              ? "text-amber-300"
                              : "text-emerald-300";

                          return (
                            <tr
                              key={site.id}
                              className={classNames(
                                "border-t border-slate-800/80 hover:bg-slate-800/40",
                                selectedSiteId === site.id
                                  ? "bg-slate-800/60"
                                  : ""
                              )}
                            >
                              <td className="px-4 py-2 align-top">
                                <button
                                  onClick={() => setSelectedSiteId(site.id)}
                                  className="text-xs font-semibold text-slate-100 hover:text-emerald-300"
                                >
                                  {site.name}
                                </button>
                                <div className="text-[11px] text-slate-500">
                                  ID #{site.id}
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top text-[11px] text-slate-300">
                                {site.location || "Localisation non précisée"}
                              </td>
                              <td className="px-4 py-2 align-top">
                                <div
                                  className={classNames(
                                    "inline-flex items-center gap-1 text-xs font-semibold",
                                    riskColor
                                  )}
                                >
                                  <span>{site.risk_score}/100</span>
                                </div>
                                <div className="mt-1 h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={classNames(
                                      "h-full rounded-full",
                                      site.risk_score >= 70
                                        ? "bg-rose-500"
                                        : site.risk_score >= 50
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                    )}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        site.risk_score
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top text-[11px] text-slate-300">
                                <div>{stats.total} incident(s)</div>
                                <div className="flex gap-2 mt-1 text-[10px] text-slate-400">
                                  <span>Cr: {stats.critical}</span>
                                  <span>Moy: {stats.medium}</span>
                                  <span>Min: {stats.minor}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top">
                                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-200">
                                  Actif
                                </span>
                              </td>
                              <td className="px-4 py-2 align-top text-right">
                                <button className="text-[11px] text-sky-300 hover:text-sky-200 mr-2">
                                  Configurer
                                </button>
                                <button className="text-[11px] text-slate-400 hover:text-slate-200">
                                  … plus tard
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Gestion des utilisateurs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/40">
              <div className="border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Gestion des utilisateurs
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comptes et rattachements aux chantiers.
                  </p>
                </div>
                <button className="px-3 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800/80 text-xs">
                  + Créer un utilisateur (maquette)
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div className="overflow-x-auto -mx-4">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800">
                      <tr className="text-slate-400">
                        <th className="px-4 py-2 text-left font-medium">
                          Utilisateur
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Rôle
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Chantier
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Statut
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_USERS.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-slate-800/70 hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-2 align-top">
                            <div className="text-xs font-semibold text-slate-100">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top text-[11px] text-slate-200">
                            {user.role}
                          </td>
                          <td className="px-4 py-2 align-top text-[11px] text-slate-300">
                            {user.site}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] border",
                                user.status === "Actif"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                              )}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 align-top text-right">
                            <button className="text-[11px] text-sky-300 hover:text-sky-100 mr-2">
                              Modifier
                            </button>
                            <button className="text-[11px] text-rose-300 hover:text-rose-100">
                              Suspendre
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500">
                  ⚠️ Pour l’instant, cette liste est une maquette front-end (aucun
                  impact réel sur l’API).
                </p>
              </div>
            </div>
          </div>

          {/* Colonne de droite : rôles + paramètres sécurité + détail chantier */}
          <div className="space-y-6">
            {/* Rôles & permissions */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/40">
              <div className="border-b border-slate-800/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Rôles & périmètres d’accès
                </h2>
                <p className="text-xs text-slate-400">
                  Modèle de rôles proposé pour Worksite Secure.
                </p>
              </div>
              <div className="px-4 py-3 space-y-3 max-h-[260px] overflow-y-auto pr-2">
                {ROLE_DEFINITIONS.map((role) => (
                  <div
                    key={role.name}
                    className={classNames(
                      "rounded-xl border px-3 py-2 text-xs space-y-1",
                      role.color
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{role.name}</span>
                      <span className="text-[10px] opacity-80">
                        {role.permissions.length} permission(s)
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      {role.description}
                    </p>
                    <ul className="mt-1 list-disc list-inside text-[11px] opacity-95">
                      {role.permissions.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres sécurité */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/40">
              <div className="border-b border-slate-800/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Paramètres sécurité (maquette)
                </h2>
                <p className="text-xs text-slate-400">
                  Politique globale de traitement des incidents.
                </p>
              </div>
              <div className="px-4 py-3 space-y-3 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-300 font-medium">
                    Seuil d’alerte incidents critiques
                  </p>
                  <p className="text-slate-400">
                    Objectif : max{" "}
                    <span className="font-semibold text-rose-300">
                      {SECURITY_PARAMS.criticalThreshold}
                    </span>{" "}
                    incident critique ouvert.
                  </p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={classNames(
                        "h-full rounded-full",
                        criticalOpen > SECURITY_PARAMS.criticalThreshold
                          ? "bg-rose-500"
                          : "bg-emerald-400"
                      )}
                      style={{
                        width: `${
                          criticalOpen === 0
                            ? 5
                            : Math.min(
                                100,
                                (criticalOpen /
                                  SECURITY_PARAMS.criticalThreshold) *
                                  100
                              )
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Actuel : {criticalOpen} incident(s) critique(s) ouvert(s).
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-300 font-medium">
                    SLAs de traitement (cible)
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-0.5">
                    <li>
                      Critique :{" "}
                      <span className="text-rose-300 font-semibold">
                        {SECURITY_PARAMS.slaHoursCritical}h
                      </span>{" "}
                      max.
                    </li>
                    <li>
                      Moyen :{" "}
                      <span className="text-amber-300 font-semibold">
                        {SECURITY_PARAMS.slaHoursMedium}h
                      </span>{" "}
                      max.
                    </li>
                    <li>
                      Mineur :{" "}
                      <span className="text-emerald-300 font-semibold">
                        {SECURITY_PARAMS.slaHoursMinor}h
                      </span>{" "}
                      max.
                    </li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-300 font-medium">
                    Notifications automatiques
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>
                      Alertes e-mail / WhatsApp vers Responsable Sécurité
                    </span>
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 border text-[11px]",
                        SECURITY_PARAMS.autoAlertsEnabled
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-600 bg-slate-800/80 text-slate-300"
                      )}
                    >
                      {SECURITY_PARAMS.autoAlertsEnabled ? "Activé" : "Désactivé"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Rapport hebdo PDF envoyé au DG</span>
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 border text-[11px]",
                        SECURITY_PARAMS.weeklyReportEnabled
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                          : "border-slate-600 bg-slate-800/80 text-slate-300"
                      )}
                    >
                      {SECURITY_PARAMS.weeklyReportEnabled ? "Activé" : "Désactivé"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  ✏️ Étape suivante du projet : connecter ces paramètres à une
                  vraie API (table <em>security_policies</em> ou équivalent).
                </p>
              </div>
            </div>

            {/* Détail du chantier sélectionné */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/40">
              <div className="border-b border-slate-800/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Chantier sélectionné (Admin)
                </h2>
                <p className="text-xs text-slate-400">
                  Résumé rapide des risques & incidents du chantier choisi.
                </p>
              </div>
              <div className="px-4 py-3 text-xs space-y-2">
                {!selectedSite && (
                  <p className="text-slate-400">
                    Aucun chantier sélectionné. Cliquez sur un chantier dans la
                    liste à gauche.
                  </p>
                )}

                {selectedSite && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {selectedSite.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {selectedSite.location || "Localisation non précisée"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">
                          Score risque
                        </p>
                        <p className="text-lg font-semibold text-amber-300">
                          {selectedSite.risk_score}/100
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-2 mt-2 space-y-1.5">
                      <p className="text-[11px] text-slate-400">
                        Synthèse incidents de ce chantier :
                      </p>
                      {(() => {
                        const stats =
                          incidentBySite[selectedSite.id] || {
                            total: 0,
                            critical: 0,
                            medium: 0,
                            minor: 0,
                          };
                        return (
                          <ul className="text-[11px] text-slate-300 space-y-0.5">
                            <li>Total : {stats.total} incident(s)</li>
                            <li className="text-rose-300">
                              Critiques : {stats.critical}
                            </li>
                            <li className="text-amber-300">
                              Moyens : {stats.medium}
                            </li>
                            <li className="text-emerald-300">
                              Mineurs : {stats.minor}
                            </li>
                          </ul>
                        );
                      })()}
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1">
                      Idée future : depuis cette carte, l’Admin pourra basculer
                      le chantier en mode <em>archivé</em>, changer le
                      responsable, ajuster les seuils de risque, etc.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
