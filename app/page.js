"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://worksite-secure-api.onrender.com";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DirecteurGeneralDashboard() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, sitesRes, incidentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/status`),
        fetch(`${API_BASE_URL}/sites`),
        fetch(`${API_BASE_URL}/incidents`),
      ]);

      if (!statusRes.ok || !sitesRes.ok || !incidentsRes.ok) {
        throw new Error("Erreur lors du chargement des données.");
      }

      const statusJson = await statusRes.json();
      const sitesJson = await sitesRes.json();
      const incidentsJson = await incidentsRes.json();

      setStatus(statusJson);
      setSites(sitesJson);
      setIncidents(incidentsJson);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ====== KPI GLOBAUX DG ======
  const totalSites = sites.length;
  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter(
    (i) => i.status && i.status.toLowerCase() === "resolu"
  ).length;
  const resolvedPercent =
    totalIncidents === 0 ? 0 : Math.round((resolvedIncidents / totalIncidents) * 100);

  const criticalIncidents = incidents.filter(
    (i) => i.severity && i.severity.toLowerCase() === "critique"
  ).length;

  // Répartition par gravité
  const severityCounts = incidents.reduce(
    (acc, incident) => {
      const sv = incident.severity?.toLowerCase();
      if (sv === "critique") acc.critique += 1;
      else if (sv === "moyen" || sv === "modéré") acc.moyen += 1;
      else acc.mineur += 1;
      return acc;
    },
    { critique: 0, moyen: 0, mineur: 0 }
  );

  // Synthèse incidents par chantier
  const siteStats = sites.map((site) => {
    const siteIncidents = incidents.filter((i) => i.site_id === site.id);
    const total = siteIncidents.length;
    const resolved = siteIncidents.filter(
      (i) => i.status && i.status.toLowerCase() === "resolu"
    ).length;
    const critical = siteIncidents.filter(
      (i) => i.severity && i.severity.toLowerCase() === "critique"
    ).length;

    // s'il y a un champ risk_score dans l’API, on l’utilise, sinon on calcule un score simple
    const riskScore =
      typeof site.risk_score === "number"
        ? site.risk_score
        : Math.min(100, critical * 30 + (total - critical) * 10);

    return {
      ...site,
      total,
      resolved,
      critical,
      riskScore,
      resolvedPercent: total === 0 ? 0 : Math.round((resolved / total) * 100),
    };
  });

  const topRiskSites = [...siteStats]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  const incidentsThisWeek = incidents.filter((incident) => {
    if (!incident.created_at) return false;
    const d = new Date(incident.created_at);
    const now = new Date();
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* ====== HEADER ====== */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300 border border-emerald-500/40">
                WS
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                  Worksite Secure —{" "}
                  <span className="text-emerald-300">Dashboard DG</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Vue stratégique globale de la sécurité sur l’ensemble des chantiers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs md:text-sm">
            <div
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border",
                status && status.status === "OK"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/50 bg-rose-500/10 text-rose-300"
              )}
            >
              <span
                className={classNames(
                  "h-2 w-2 rounded-full",
                  status && status.status === "OK"
                    ? "bg-emerald-400"
                    : "bg-rose-400"
                )}
              />
              Backend{" "}
              {status && status.status === "OK" ? "en ligne" : "hors ligne"} — API{" "}
              <span className="font-semibold">
                v{status?.version || "0.0.0"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span>Dernière mise à jour :</span>
              <span className="font-medium text-slate-200">
                {lastRefresh
                  ? lastRefresh.toLocaleTimeString()
                  : "—"}
              </span>
              <button
                onClick={loadData}
                className="ml-2 inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 transition"
              >
                ⟳ Rafraîchir
              </button>
            </div>
          </div>
        </header>

        {/* ====== BANNIÈRE ERREUR ====== */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <div className="font-semibold mb-1">
              Impossible de charger les données Worksite Secure.
            </div>
            <div className="text-xs text-rose-200">{error}</div>
          </div>
        )}

        {/* ====== KPIs DG ====== */}
        <section className="grid gap-4 md:grid-cols-4">
          {/* Nombre de chantiers */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/60">
            <h2 className="text-xs font-medium text-slate-400 mb-1">
              Nombre de chantiers
            </h2>
            <p className="text-3xl font-semibold text-slate-50">{totalSites}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Sites suivis dans Worksite Secure.
            </p>
          </div>

          {/* Incidents déclarés */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-lg shadow-amber-900/40">
            <h2 className="text-xs font-medium text-amber-200 mb-1">
              Incidents déclarés (tous types)
            </h2>
            <p className="text-3xl font-semibold text-amber-50">
              {totalIncidents}
            </p>
            <p className="mt-1 text-[11px] text-amber-100/80">
              Vol, accident, intrusion, non-conformité…
            </p>
          </div>

          {/* % incidents résolus */}
          <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 shadow-lg shadow-sky-900/40">
            <h2 className="text-xs font-medium text-sky-200 mb-1">
              % incidents résolus
            </h2>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-semibold text-sky-50">
                {resolvedPercent}%
              </p>
              <span className="text-xs text-sky-200">
                {resolvedIncidents}/{totalIncidents || 1} incident(s)
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-900/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-400"
                style={{ width: `${resolvedPercent}%` }}
              />
            </div>
          </div>

          {/* Incidents critiques */}
          <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 shadow-lg shadow-rose-900/50">
            <h2 className="text-xs font-medium text-rose-200 mb-1">
              Incidents critiques
            </h2>
            <p className="text-3xl font-semibold text-rose-50">
              {criticalIncidents}
            </p>
            <p className="mt-1 text-[11px] text-rose-100/80">
              Nécessitent un arbitrage DG prioritaire.
            </p>
          </div>
        </section>

        {/* ====== CONTENU PRINCIPAL ====== */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Colonne gauche : panorama incidents */}
          <div className="space-y-4 lg:col-span-2">
            {/* Répartition par gravité */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">
                Répartition des incidents par gravité (tous chantiers)
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-rose-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    Critique
                  </span>
                  <span className="font-mono text-rose-100">
                    {severityCounts.critique} incident(s)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-amber-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Moyen
                  </span>
                  <span className="font-mono text-amber-100">
                    {severityCounts.moyen} incident(s)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-emerald-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Mineur
                  </span>
                  <span className="font-mono text-emerald-100">
                    {severityCounts.mineur} incident(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Incidents récents (7 derniers jours) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Incidents récents (7 derniers jours)
                </h3>
                <span className="text-[11px] text-slate-400">
                  {incidentsThisWeek.length} incident(s)
                </span>
              </div>
              {incidentsThisWeek.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun incident déclaré cette semaine.
                </p>
              ) : (
                <ul className="divide-y divide-slate-800 text-xs">
                  {incidentsThisWeek.map((incident) => {
                    const site = sites.find((s) => s.id === incident.site_id);
                    return (
                      <li
                        key={incident.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-100">
                            {incident.type || "Incident"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {incident.description}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {site ? site.name : "Chantier inconnu"} •{" "}
                            {incident.created_at &&
                              new Date(
                                incident.created_at
                              ).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={classNames(
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                              incident.severity?.toLowerCase() === "critique"
                                ? "bg-rose-500/15 text-rose-200 border border-rose-500/40"
                                : incident.severity?.toLowerCase() === "moyen"
                                ? "bg-amber-500/15 text-amber-200 border border-amber-500/40"
                                : "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                            )}
                          >
                            {incident.severity || "Gravité ?"}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 bg-slate-900">
                            Statut : {incident.status || "Inconnu"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Colonne droite : top chantiers à risque */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">
                Top 3 chantiers à risque
              </h3>
              {topRiskSites.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun chantier enregistré pour le moment.
                </p>
              ) : (
                <ul className="space-y-3 text-xs">
                  {topRiskSites.map((site) => (
                    <li
                      key={site.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-100">
                            {site.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {site.location || "Localisation non précisée"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">
                            Score risque
                          </div>
                          <div className="text-lg font-semibold text-amber-300">
                            {site.riskScore}/100
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{site.total} incident(s)</span>
                        <span>
                          {site.critical} critique(s) • {site.resolvedPercent}% résolus
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${Math.min(site.riskScore, 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300 space-y-1.5">
              <h4 className="text-sm font-semibold text-slate-100 mb-1">
                Rôle du Directeur Général
              </h4>
              <p>• Arbitrer les priorités entre chantiers.</p>
              <p>• Suivre l’évolution globale des risques.</p>
              <p>• Vérifier que les incidents critiques sont traités.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
