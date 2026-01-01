"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function fetchJson(path) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur API ${res.status} – ${text || res.statusText}`);
  }
  return res.json();
}

function formatDate(dateStr) {
  if (!dateStr) return "Date inconnue";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function severityBadgeClass(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critique":
      return "bg-red-500/10 text-red-300 border border-red-500/40";
    case "moyen":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
    case "mineur":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30";
    default:
      return "bg-slate-500/10 text-slate-200 border border-slate-500/30";
  }
}

function statusBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "nouveau":
      return "bg-sky-500/10 text-sky-300 border border-sky-500/40";
    case "en cours":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
    case "résolu":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
    default:
      return "bg-slate-500/10 text-slate-200 border border-slate-500/30";
  }
}

export default function ResponsableSecuritePage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // filtres
  const [filterSeverity, setFilterSeverity] = useState("all"); // all | critique | moyen | mineur
  const [filterStatus, setFilterStatus] = useState("open"); // open | all

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [statusData, sitesData, incidentsData] = await Promise.all([
          fetchJson("/status"),
          fetchJson("/sites"),
          fetchJson("/incidents"),
        ]);

        if (!active) return;

        setStatus(statusData || null);
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError(err.message || "Erreur lors du chargement des données.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    const interval = setInterval(load, 20000); // rafraîchissement auto
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Stat globales
  const totalSites = sites.length;
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(
    (i) => (i.status || "").toLowerCase() !== "résolu"
  );
  const criticalOpen = openIncidents.filter(
    (i) => (i.severity || "").toLowerCase() === "critique"
  );

  const resolvedCount = incidents.filter(
    (i) => (i.status || "").toLowerCase() === "résolu"
  ).length;
  const resolvedPercent =
    totalIncidents === 0 ? 0 : Math.round((resolvedCount / totalIncidents) * 100);

  // Comptage par gravité (tous incidents)
  const severityCounts = incidents.reduce(
    (acc, incident) => {
      const sev = (incident.severity || "").toLowerCase();
      if (sev === "critique") acc.critique += 1;
      else if (sev === "moyen") acc.moyen += 1;
      else if (sev === "mineur") acc.mineur += 1;
      else acc.autres += 1;
      return acc;
    },
    { critique: 0, moyen: 0, mineur: 0, autres: 0 }
  );

  // Classement des sites en fonction des incidents ouverts et critiques
  const rankedSites = useMemo(() => {
    return sites
      .map((site) => {
        const siteIncidents = incidents.filter(
          (i) => String(i.site_id) === String(site.id)
        );
        const open = siteIncidents.filter(
          (i) => (i.status || "").toLowerCase() !== "résolu"
        );
        const crit = open.filter(
          (i) => (i.severity || "").toLowerCase() === "critique"
        );
        return {
          ...site,
          totalIncidents: siteIncidents.length,
          openCount: open.length,
          criticalOpenCount: crit.length,
        };
      })
      .sort((a, b) => {
        if (b.criticalOpenCount !== a.criticalOpenCount) {
          return b.criticalOpenCount - a.criticalOpenCount;
        }
        return b.openCount - a.openCount;
      });
  }, [sites, incidents]);

  // Application des filtres pour la table des incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const sev = (incident.severity || "").toLowerCase();
      const stat = (incident.status || "").toLowerCase();

      if (filterSeverity !== "all" && sev !== filterSeverity) {
        return false;
      }

      if (filterStatus === "open" && stat === "résolu") {
        return false;
      }

      return true;
    });
  }, [incidents, filterSeverity, filterStatus]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Vue DG ➜ Responsable Sécurité
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
              Worksite Secure — Vue Responsable Sécurité
            </h1>
            <p className="text-sm text-slate-400">
              Supervision globale des incidents sur tous les chantiers.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                status && status.status === "OK"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/10 text-red-300 border border-red-500/40"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  status && status.status === "OK"
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              ></span>
              {status && status.status === "OK"
                ? `Backend en ligne · API v${status.version || "0.1.0"}`
                : "Backend hors ligne"}
            </div>
            <p className="text-[11px] text-slate-500">
              Dernière mise à jour :{" "}
              {lastUpdated
                ? new Intl.DateTimeFormat("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(lastUpdated)
                : "—"}
            </p>
          </div>
        </header>

        {/* Erreur éventuelle */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* KPIs globaux */}
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <p className="text-xs font-medium text-slate-400">
              Nombre de chantiers
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {totalSites}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Sites suivis dans Worksite Secure.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <p className="text-xs font-medium text-slate-400">
              Incidents déclarés (tous types)
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {totalIncidents}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Vol, accident, intrusion, etc.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <p className="text-xs font-medium text-slate-400">
              % incidents résolus
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold text-emerald-400">
                {resolvedPercent}%
              </p>
              <p className="text-[11px] text-slate-500">
                {resolvedCount} / {totalIncidents} résolus
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${resolvedPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <p className="text-xs font-medium text-slate-400">
              Incidents critiques ouverts
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold text-red-400">
                {criticalOpen.length}
              </p>
              <p className="text-[11px] text-slate-500">
                Sur {openIncidents.length} incident(s) ouvert(s)
              </p>
            </div>
            <p className="mt-2 text-[11px] text-red-200">
              🎯 Objectif : ramener ce chiffre à 0.
            </p>
          </div>
        </section>

        {/* Grille principale */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Colonne 1 : gravité + indicateurs */}
          <div className="space-y-4">
            {/* Gravité */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  Répartition des incidents par gravité
                </h2>
                <span className="text-[11px] text-slate-500">
                  Tous les sites
                </span>
              </div>

              {totalIncidents === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun incident déclaré pour le moment.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  {["critique", "moyen", "mineur"].map((level) => {
                    const label =
                      level === "critique"
                        ? "Critique"
                        : level === "moyen"
                        ? "Moyen"
                        : "Mineur";
                    const value = severityCounts[level];
                    const percent =
                      totalIncidents === 0
                        ? 0
                        : Math.round((value / totalIncidents) * 100);

                    const barClass =
                      level === "critique"
                        ? "bg-red-500"
                        : level === "moyen"
                        ? "bg-amber-400"
                        : "bg-emerald-400";

                    return (
                      <div key={level}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-slate-100">{label}</span>
                          <span className="text-[11px] text-slate-400">
                            {value} incident(s) · {percent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-[11px] text-slate-500">
                Utilise cette vue pour prioriser les actions correctives et les
                campagnes de sensibilisation.
              </p>
            </div>

            {/* Synthèse incidents ouverts */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                Incidents ouverts par statut
              </h2>
              <ul className="space-y-1 text-xs text-slate-300">
                <li>
                  <span className="inline-block w-20 text-slate-400">
                    Nouveaux :
                  </span>
                  {
                    incidents.filter(
                      (i) =>
                        (i.status || "").toLowerCase() === "nouveau"
                    ).length
                  }
                </li>
                <li>
                  <span className="inline-block w-20 text-slate-400">
                    En cours :
                  </span>
                  {
                    incidents.filter(
                      (i) =>
                        (i.status || "").toLowerCase() === "en cours"
                    ).length
                  }
                </li>
                <li>
                  <span className="inline-block w-20 text-slate-400">
                    Résolus :
                  </span>
                  {resolvedCount}
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                Focus Responsable Sécurité : réduire au maximum les{" "}
                <span className="font-semibold text-sky-300">Nouveaux</span> et{" "}
                <span className="font-semibold text-amber-300">En cours</span>.
              </p>
            </div>
          </div>

          {/* Colonne 2 : classement des sites */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  Sites les plus sensibles
                </h2>
                <span className="text-[11px] text-slate-500">
                  Triés par incidents critiques ouverts
                </span>
              </div>

              {rankedSites.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun site enregistré pour le moment.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {rankedSites.slice(0, 5).map((site, index) => (
                    <div
                      key={site.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-slate-300">
                            #{index + 1}
                          </span>
                          <p className="font-semibold text-slate-100">
                            {site.name || `Chantier #${site.id}`}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Score risque :{" "}
                          {site.risk_score != null
                            ? `${site.risk_score}/100`
                            : "N/A"}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        📍 {site.location || "Localisation non précisée"}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-200">
                          {site.criticalOpenCount} critique(s) ouvert(s)
                        </span>
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-200">
                          {site.openCount} incident(s) ouvert(s)
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                          {site.totalIncidents} total
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[11px] text-slate-500">
                À utiliser pour cibler les audits, visites terrain et plans
                d&apos;action prioritaires.
              </p>
            </div>
          </div>

          {/* Colonne 3 : table des incidents filtrable */}
          <div className="space-y-4 md:col-span-1">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  Incidents (vue filtrée)
                </h2>
                <span className="text-[11px] text-slate-500">
                  {filteredIncidents.length} incident(s)
                </span>
              </div>

              {/* Filtres */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-400 mr-1">Gravité :</span>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterSeverity === "all"
                      ? "bg-slate-800 text-slate-100"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterSeverity("all")}
                >
                  Toutes
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterSeverity === "critique"
                      ? "bg-red-500 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterSeverity("critique")}
                >
                  Critiques
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterSeverity === "moyen"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterSeverity("moyen")}
                >
                  Moyens
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterSeverity === "mineur"
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterSeverity("mineur")}
                >
                  Mineurs
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-400 mr-1">Statut :</span>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterStatus === "open"
                      ? "bg-slate-800 text-slate-100"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterStatus("open")}
                >
                  Ouverts uniquement
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 ${
                    filterStatus === "all"
                      ? "bg-slate-800 text-slate-100"
                      : "bg-slate-900 text-slate-400"
                  }`}
                  onClick={() => setFilterStatus("all")}
                >
                  Tous les statuts
                </button>
              </div>

              {/* Liste incidents */}
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredIncidents.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Aucun incident ne correspond aux filtres.
                  </p>
                )}

                {filteredIncidents.map((incident) => {
                  const site =
                    sites.find(
                      (s) => String(s.id) === String(incident.site_id)
                    ) || null;

                  return (
                    <div
                      key={incident.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <p className="font-semibold text-slate-100">
                          {incident.type || "Incident"}
                        </p>
                        <div className="flex gap-2">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                              severityBadgeClass(incident.severity)
                            }
                          >
                            {incident.severity || "Gravité N/A"}
                          </span>
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                              statusBadgeClass(incident.status)
                            }
                          >
                            {incident.status || "Statut N/A"}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300">
                        {incident.description || "Aucune description fournie."}
                      </p>

                      <p className="mt-2 text-[11px] text-slate-500">
                        🏗{" "}
                        {site
                          ? site.name || `Chantier #${site.id}`
                          : `Chantier #${incident.site_id}`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ⏱ Déclaré le {formatDate(incident.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aide */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 shadow-lg">
              <h3 className="mb-2 text-sm font-semibold text-slate-100">
                Rôle du Responsable Sécurité
              </h3>
              <ul className="list-disc space-y-1 pl-4">
                <li>Surveiller les incidents critiques sur tous les chantiers.</li>
                <li>Identifier les sites les plus sensibles pour prioriser les audits.</li>
                <li>Suivre le taux de résolution global des incidents.</li>
                <li>Travailler avec la Direction Travaux et les Chefs de chantier.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
