"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://worksite-secure-api.onrender.com";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DirectionTravauxPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
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
      if (!selectedSiteId && sitesJson.length > 0) {
        setSelectedSiteId(sitesJson[0].id);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;
  const siteIncidents = incidents.filter((i) => i.site_id === selectedSiteId);

  const siteResolved = siteIncidents.filter(
    (i) => i.status && i.status.toLowerCase() === "resolu"
  ).length;
  const siteCritical = siteIncidents.filter(
    (i) => i.severity && i.severity.toLowerCase() === "critique"
  ).length;
  const siteResolvedPercent =
    siteIncidents.length === 0
      ? 0
      : Math.round((siteResolved / siteIncidents.length) * 100);

  const severityCounts = siteIncidents.reduce(
    (acc, incident) => {
      const sv = incident.severity?.toLowerCase();
      if (sv === "critique") acc.critique += 1;
      else if (sv === "moyen" || sv === "modéré") acc.moyen += 1;
      else acc.mineur += 1;
      return acc;
    },
    { critique: 0, moyen: 0, mineur: 0 }
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
              Vue DG → Direction Travaux
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Worksite Secure —{" "}
              <span className="text-amber-300">Vue Direction Travaux</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Pilotage opérationnel de la sécurité chantier par chantier.
            </p>
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
                ⟳ Rafraîchir les données
              </button>
            </div>
          </div>
        </header>

        {/* BANNIÈRE ERREUR */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <div className="font-semibold mb-1">
              Impossible de charger les données Worksite Secure.
            </div>
            <div className="text-xs text-rose-200">{error}</div>
          </div>
        )}

        {/* Sélecteur de chantier */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-100">
              Sélectionner votre chantier
            </h2>
            <p className="text-xs text-slate-400">
              La vue ci-dessous sera entièrement filtrée sur le chantier choisi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Chantier :</label>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs md:text-sm text-slate-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              value={selectedSiteId || ""}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
              {sites.length === 0 && (
                <option value="">Aucun chantier disponible</option>
              )}
            </select>
          </div>
        </section>

        {/* Si aucun chantier */}
        {!selectedSite && !loading && (
          <p className="text-xs text-slate-500">
            Aucun chantier sélectionné pour le moment.
          </p>
        )}

        {/* Contenu principal Direction Travaux */}
        {selectedSite && (
          <section className="grid gap-4 lg:grid-cols-3">
            {/* Colonne gauche : liste de chantiers + incidents ouverts */}
            <div className="space-y-4 lg:col-span-1">
              {/* Liste des chantiers suivis */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">
                  Chantiers suivis
                </h3>
                <p className="text-[11px] text-slate-500 mb-2">
                  Cliquez sur un chantier pour basculer la vue.
                </p>
                <ul className="space-y-2 text-xs">
                  {sites.map((site) => {
                    const siteIncidents = incidents.filter(
                      (i) => i.site_id === site.id
                    );
                    const critical = siteIncidents.filter(
                      (i) =>
                        i.severity && i.severity.toLowerCase() === "critique"
                    ).length;
                    const riskScore =
                      typeof site.risk_score === "number"
                        ? site.risk_score
                        : Math.min(
                            100,
                            critical * 30 + (siteIncidents.length - critical) * 10
                          );
                    const isSelected = selectedSiteId === site.id;

                    return (
                      <li key={site.id}>
                        <button
                          onClick={() => setSelectedSiteId(site.id)}
                          className={classNames(
                            "w-full rounded-xl border px-3 py-2 text-left transition",
                            isSelected
                              ? "border-amber-500/70 bg-amber-500/10"
                              : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                          )}
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
                              <div className="text-base font-semibold text-amber-300">
                                {riskScore}/100
                              </div>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{siteIncidents.length} incident(s)</span>
                            <span>
                              {critical} critique(s)
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {sites.length === 0 && (
                    <li className="text-xs text-slate-500">
                      Aucun chantier enregistré pour l’instant.
                    </li>
                  )}
                </ul>
              </div>

              {/* Incidents ouverts sur le chantier sélectionné */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">
                  Incidents ouverts sur ce chantier
                </h3>
                <p className="text-[11px] text-slate-500 mb-2">
                  Vue rapide des incidents à traiter en priorité.
                </p>
                <ul className="space-y-1 text-xs">
                  {siteIncidents
                    .filter(
                      (i) =>
                        i.status &&
                        i.status.toLowerCase() !== "resolu" &&
                        i.status.toLowerCase() !== "résolu"
                    )
                    .map((incident) => (
                      <li
                        key={incident.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-slate-100">
                              {incident.type || "Incident"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {incident.description}
                            </div>
                          </div>
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
                        </div>
                      </li>
                    ))}

                  {siteIncidents.filter(
                    (i) =>
                      i.status &&
                      i.status.toLowerCase() !== "resolu" &&
                      i.status.toLowerCase() !== "résolu"
                  ).length === 0 && (
                    <li className="text-xs text-emerald-300">
                      Aucun incident ouvert sur ce chantier. ✅
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Colonne centrale : focus chantier sélectionné */}
            <div className="space-y-4 lg:col-span-2">
              {/* Carte info chantier */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">
                  Chantier sélectionné
                </h3>
                <div className="grid gap-4 md:grid-cols-3 text-xs">
                  <div className="md:col-span-2 space-y-1.5">
                    <div className="text-sm font-semibold text-slate-50">
                      {selectedSite.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {selectedSite.location || "Localisation non précisée"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Responsable :{" "}
                      <span className="font-medium text-slate-200">
                        {selectedSite.manager || "Non renseigné"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">
                      Score de risque global
                    </div>
                    <div className="text-2xl font-semibold text-amber-300">
                      {typeof selectedSite.risk_score === "number"
                        ? selectedSite.risk_score
                        : Math.min(
                            100,
                            siteCritical * 30 +
                              (siteIncidents.length - siteCritical) * 10
                          )}
                      /100
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${
                            typeof selectedSite.risk_score === "number"
                              ? selectedSite.risk_score
                              : Math.min(
                                  100,
                                  siteCritical * 30 +
                                    (siteIncidents.length - siteCritical) * 10
                                )
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI chantier */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs text-slate-400 mb-1">
                    Incidents sur ce chantier
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {siteIncidents.length}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Tous types confondus (vol, accident, intrusion…)
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs text-slate-400 mb-1">
                    % incidents résolus
                  </div>
                  <div className="text-2xl font-semibold text-emerald-300">
                    {siteResolvedPercent}%
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${siteResolvedPercent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {siteResolved}/{siteIncidents.length || 1} incident(s) clôturé(s)
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-xs text-slate-400 mb-1">
                    Incidents critiques
                  </div>
                  <div className="text-2xl font-semibold text-rose-300">
                    {siteCritical}
                  </div>
                  <div className="mt-1 text-[11px] text-rose-200/80">
                    À suivre en priorité avec le Responsable Sécurité.
                  </div>
                </div>
              </div>

              {/* Répartition par gravité & liste incidents */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Gravité */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <h3 className="text-sm font-semibold text-slate-100 mb-2">
                    Vue risques par gravité (chantier sélectionné)
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-rose-200">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                          Critique
                        </span>
                        <span className="font-mono text-rose-100">
                          {severityCounts.critique} incident(s)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-amber-200">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                          Moyen
                        </span>
                        <span className="font-mono text-amber-100">
                          {severityCounts.moyen} incident(s)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
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
                </div>

                {/* Liste incidents du chantier */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Incidents du chantier
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {siteIncidents.length} incident(s)
                    </span>
                  </div>
                  {siteIncidents.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Aucun incident déclaré sur ce chantier.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-800 text-xs">
                      {siteIncidents.map((incident) => (
                        <li key={incident.id} className="py-2 flex gap-3">
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-100">
                                {incident.type || "Incident"}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {incident.created_at &&
                                  new Date(
                                    incident.created_at
                                  ).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {incident.description}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Statut :{" "}
                              <span className="font-medium text-slate-200">
                                {incident.status || "Inconnu"}
                              </span>
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
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Mode d'emploi */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300 space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-100 mb-1">
                  Rôle de la Direction Travaux
                </h4>
                <p>• Suivre au quotidien les incidents chantier par chantier.</p>
                <p>• Travailler avec les chefs de chantiers pour réduire les risques.</p>
                <p>• Faire remonter au DG les situations critiques persistantes.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
