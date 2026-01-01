"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://worksite-secure-api.onrender.com";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ChefChantierPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Formulaire nouvel incident
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formIncident, setFormIncident] = useState({
    type: "",
    severity: "Moyen",
    description: "",
  });

  // =========================
  // CHARGEMENT DES DONNÉES
  // =========================
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

      // ✅ Normalisation : toujours des STRING pour id et site_id
      const normSites = (sitesJson || []).map((s) => ({
        ...s,
        id: String(s.id),
      }));
      const normIncidents = (incidentsJson || []).map((i) => ({
        ...i,
        id: String(i.id),
        site_id: String(i.site_id),
      }));

      setStatus(statusJson);
      setSites(normSites);
      setIncidents(normIncidents);

      if (!selectedSiteId && normSites.length > 0) {
        setSelectedSiteId(normSites[0].id);
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

  const selectedSite =
    sites.find((s) => String(s.id) === String(selectedSiteId)) || null;

  const siteIncidents = incidents.filter(
    (i) => String(i.site_id) === String(selectedSiteId)
  );

  // KPI chantier
  const openedIncidents = siteIncidents.filter(
    (i) => i.status && !["resolu", "résolu"].includes(i.status.toLowerCase())
  );
  const resolvedIncidents = siteIncidents.filter(
    (i) => i.status && ["resolu", "résolu"].includes(i.status.toLowerCase())
  );
  const resolvedPercent =
    siteIncidents.length === 0
      ? 0
      : Math.round((resolvedIncidents.length / siteIncidents.length) * 100);

  // =========================
  //  CREATION INCIDENT
  // =========================
  async function handleCreateIncident(e) {
    e.preventDefault();
    if (!selectedSiteId) return;
    if (!formIncident.type.trim() || !formIncident.description.trim()) {
      alert("Merci de remplir au moins le type et la description.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_id: selectedSiteId, // string ou int, l’API s’en fiche
          type: formIncident.type.trim(),
          severity: formIncident.severity,
          description: formIncident.description.trim(),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Erreur API (POST /incidents) : ${res.status} ${txt || ""}`
        );
      }

      const created = await res.json();

      // normalisation
      const normCreated = {
        ...created,
        id: String(created.id),
        site_id: String(created.site_id),
      };

      setIncidents((prev) => [...prev, normCreated]);

      setFormIncident({
        type: "",
        severity: "Moyen",
        description: "",
      });
      setShowForm(false);
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur lors de la création de l’incident.");
    } finally {
      setCreating(false);
    }
  }

  // =========================
  //  CHANGEMENT DE STATUT
  // =========================
  async function updateIncidentStatus(incidentId, newStatus) {
    try {
      setError(null);

      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Erreur API (PATCH /incidents/${incidentId}) : ${res.status} ${
            txt || ""
          }`
        );
      }

      const updated = await res.json();
      const normUpdated = {
        ...updated,
        id: String(updated.id),
        site_id: String(updated.site_id),
      };

      setIncidents((prev) =>
        prev.map((i) => (String(i.id) === String(incidentId) ? normUpdated : i))
      );
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur lors de la mise à jour de l’incident.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
              Vue DG → Chef de chantier
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Worksite Secure —{" "}
              <span className="text-sky-300">Vue Chef de Chantier</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Pilotage opérationnel de la sécurité sur un chantier précis.
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
                {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}
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

        {/* BANNIÈRE ERREUR */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <div className="font-semibold mb-1">
              Problème Worksite Secure pour ce chantier.
            </div>
            <div className="text-xs text-rose-200">{error}</div>
          </div>
        )}

        {/* Sélecteur de chantier + bouton création */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-100">
              Vos chantiers suivis
            </h2>
            <p className="text-xs text-slate-400">
              Le tableau ci-dessous est filtré sur le chantier sélectionné.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Chantier :</label>
              <select
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs md:text-sm text-slate-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                value={selectedSiteId || ""}
                onChange={(e) => setSelectedSiteId(String(e.target.value))}
              >
                {sites.map((site) => (
                  <option key={site.id} value={String(site.id)}>
                    {site.name}
                  </option>
                ))}
                {sites.length === 0 && (
                  <option value="">Aucun chantier disponible</option>
                )}
              </select>
            </div>

            <button
              onClick={() => {
                if (!selectedSite) {
                  alert("Merci de sélectionner un chantier d’abord.");
                  return;
                }
                setShowForm(true);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/20 transition"
            >
              ➕ Déclarer un incident
            </button>
          </div>
        </section>

        {/* Message si vraiment aucun chantier */}
        {!selectedSite && !loading && (
          <p className="text-xs text-slate-500">
            Aucun chantier sélectionné pour le moment.
          </p>
        )}

        {/* FORMULAIRE NOUVEL INCIDENT */}
        {showForm && selectedSite && (
          <section className="rounded-2xl border border-sky-500/40 bg-slate-900/90 p-4 space-y-3 mt-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-sky-100">
                  Déclarer un nouvel incident
                </h3>
                <p className="text-xs text-slate-400">
                  Le chef de chantier renseigne les informations essentielles.
                  Le Responsable Sécurité pourra ensuite compléter si besoin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-slate-400 hover:text-slate-100"
              >
                ✕ Fermer
              </button>
            </div>

            <form
              onSubmit={handleCreateIncident}
              className="grid gap-3 md:grid-cols-2 text-xs"
            >
              <div className="space-y-1 md:col-span-2">
                <label className="block text-slate-300">
                  Chantier concerné
                </label>
                <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-sm">
                  {selectedSite.name}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300">Type d’incident</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                  placeholder="Vol de matériel, chute, intrusion..."
                  value={formIncident.type}
                  onChange={(e) =>
                    setFormIncident((f) => ({ ...f, type: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300">Gravité</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                  value={formIncident.severity}
                  onChange={(e) =>
                    setFormIncident((f) => ({ ...f, severity: e.target.value }))
                  }
                >
                  <option value="Critique">Critique</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Mineur">Mineur</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-slate-300">
                  Description (résumé de l’incident)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                  rows={3}
                  placeholder="Ex : Vol de 15 sacs de ciment repéré ce matin à 7h..."
                  value={formIncident.description}
                  onChange={(e) =>
                    setFormIncident((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-600 bg-slate-900 px-4 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full border border-sky-500 bg-sky-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                >
                  {creating ? "Enregistrement..." : "Enregistrer l’incident"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* CONTENU PRINCIPAL chantier sélectionné */}
        {selectedSite && (
          <section className="grid gap-4 lg:grid-cols-3 mt-2">
            {/* COLONNE GAUCHE : infos chantier + KPI */}
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">
                  Chantier sélectionné
                </h3>
                <div className="space-y-1 text-xs">
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
                  <div className="mt-3 text-[11px] text-slate-400">
                    Incidents enregistrés :{" "}
                    <span className="font-semibold text-slate-100">
                      {siteIncidents.length}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Incident(s) ouvert(s) :{" "}
                    <span className="font-semibold text-amber-200">
                      {openedIncidents.length}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    % incidents résolus :{" "}
                    <span className="font-semibold text-emerald-200">
                      {resolvedPercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300 space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-100 mb-1">
                  Mode d’emploi rapide
                </h4>
                <p>1️⃣ Choisis ton chantier dans la liste en haut.</p>
                <p>2️⃣ Clique sur “Déclarer un incident” après chaque événement.</p>
                <p>
                  3️⃣ Mets à jour le statut (Nouveau → En cours → Résolu) dès
                  qu’une action est faite.
                </p>
              </div>
            </div>

            {/* COLONNE CENTRALE + DROITE : incidents du chantier */}
            <div className="space-y-4 lg:col-span-2">
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
                    Aucun incident déclaré sur ce chantier pour le moment.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800 text-xs">
                    {siteIncidents
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.created_at || 0) -
                          new Date(a.created_at || 0)
                      )
                      .map((incident) => (
                        <li
                          key={incident.id}
                          className="py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                        >
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
                          </div>

                          <div className="flex items-center gap-2 mt-1 md:mt-0">
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                                incident.severity?.toLowerCase() ===
                                  "critique"
                                  ? "bg-rose-500/15 text-rose-200 border border-rose-500/40"
                                  : incident.severity?.toLowerCase() === "moyen"
                                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/40"
                                  : "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                              )}
                            >
                              {incident.severity || "Gravité ?"}
                            </span>

                            <span className="inline-flex rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 bg-slate-900">
                              {incident.status || "Statut ?"}
                            </span>

                            {/* Boutons changement de statut */}
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateIncidentStatus(incident.id, "En cours")
                                }
                                className="rounded-full border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/20"
                              >
                                En cours
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateIncidentStatus(incident.id, "Résolu")
                                }
                                className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-100 hover:bg-emerald-500/20"
                              >
                                Résolu
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
