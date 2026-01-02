"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://worksite-secure-api.onrender.com";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ChefDeChantierPage() {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Formulaire création incident
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("Accident");
  const [formSeverity, setFormSeverity] = useState("Moyen");
  const [formDescription, setFormDescription] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [sitesRes, incidentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sites`),
        fetch(`${API_BASE_URL}/incidents`),
      ]);

      if (!sitesRes.ok || !incidentsRes.ok) {
        throw new Error("Erreur lors du chargement des données.");
      }

      const sitesJson = await sitesRes.json();
      const incidentsJson = await incidentsRes.json();

      setSites(sitesJson);
      setIncidents(incidentsJson);

      // si aucun chantier sélectionné, prendre le premier
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

  const incidentsForSite = incidents.filter(
    (i) => i.site_id === selectedSiteId
  );

  async function handleCreateIncident(e) {
    e.preventDefault();
    if (!selectedSiteId) {
      alert("Sélectionne d’abord un chantier.");
      return;
    }
    try {
      setError(null);
      const resp = await fetch(`${API_BASE_URL}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedSiteId,
          type: formType,
          severity: formSeverity,
          description: formDescription || "(description vide)",
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          "Impossible de créer l’incident. " + (txt || resp.status)
        );
      }

      // On recharge la liste
      setFormDescription("");
      setShowForm(false);
      await loadData();
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur lors de la création de l’incident.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] text-slate-400 mb-1">
              VUE DG → CHEF DE CHANTIER
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-300 border border-sky-500/40">
                CC
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                  Worksite Secure —{" "}
                  <span className="text-sky-300">Vue Chef de Chantier</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Pilotage opérationnel de la sécurité sur un chantier précis.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs md:text-sm">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Backend en ligne — API v0.1.0
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
            <div className="font-semibold mb-1">Problème Worksite Secure.</div>
            <div className="text-xs text-rose-200">{error}</div>
          </div>
        )}

        {/* CONTENU PRINCIPAL */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          {/* Colonne gauche : sélection chantier + fiche */}
          <div className="space-y-4">
            {/* Sélecteur de chantier */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Vos chantiers suivis
                </h2>
                <span className="text-[11px] text-slate-400">
                  {sites.length} chantier(s)
                </span>
              </div>
              {sites.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun chantier défini pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  {selectedSite && (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-100">
                        Chantier sélectionné
                      </div>
                      <div className="text-slate-300">{selectedSite.name}</div>
                      <div className="text-slate-500">
                        {selectedSite.location || "Localisation non précisée"}
                      </div>
                      <div className="text-slate-500">
                        Responsable local :{" "}
                        {selectedSite.manager || "Non renseigné"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode d’emploi rapide */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300 space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                Mode d’emploi rapide
              </h3>
              <p>☑ Choisis ton chantier dans la liste en haut.</p>
              <p>☑ Clique sur “Déclarer un incident” après chaque événement.</p>
              <p>
                ☑ Mets à jour le statut (Nouveau → En cours → Résolu) une fois
                l’action effectuée (à venir).
              </p>
            </div>
          </div>

          {/* Colonne droite : incidents du chantier */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Incidents du chantier
                </h2>
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/20 transition"
                >
                  + Déclarer un incident
                </button>
              </div>

              {/* Formulaire de création */}
              {showForm && (
                <form
                  onSubmit={handleCreateIncident}
                  className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 space-y-2 text-xs"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-400">
                        Type d’incident
                      </label>
                      <input
                        type="text"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-400">
                        Gravité
                      </label>
                      <select
                        value={formSeverity}
                        onChange={(e) => setFormSeverity(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="Critique">Critique</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Mineur">Mineur</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-400">
                      Description
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="Ex : Chute d’un ouvrier au niveau de la dalle R+2…"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="rounded-full border border-emerald-500 bg-emerald-500 px-3 py-1 text-[11px] font-medium text-slate-950 hover:bg-emerald-400"
                    >
                      Enregistrer l’incident
                    </button>
                  </div>
                </form>
              )}

              {/* Liste des incidents */}
              {loading ? (
                <p className="text-xs text-slate-500">
                  Chargement des incidents…
                </p>
              ) : incidentsForSite.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun incident déclaré pour ce chantier.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {incidentsForSite.map((incident) => (
                    <li
                      key={incident.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-100">
                          {incident.type}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {incident.description}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Déclaré le{" "}
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
                          {incident.severity}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 bg-slate-900">
                          Statut : {incident.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
