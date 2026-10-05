"use client";

// The main view: search + list on the left, map in the middle, hole detail right.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getHoles } from "@/lib/api";
import { distinctName } from "@/lib/format";
import HoleDetail from "@/components/HoleDetail";

// MapLibre touches `window`, so it can't run during server rendering.
const HoleMap = dynamic(() => import("@/components/HoleMap"), {
  ssr: false,
  loading: () => <p className="hint" style={{ padding: 16 }}>Loading map…</p>,
});

export default function ExplorePage() {
  const [holes, setHoles] = useState([]);
  const [search, setSearch] = useState("");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  // hoveredId: cheap live preview (list row + map highlight only, no fetch).
  // detailId: what the right-hand panel actually fetches and shows - only
  // moves on a real click, so sweeping the mouse across the list or map
  // doesn't fire a getHole/getMeasurements/... round trip per hole passed over.
  const [hoveredId, setHoveredId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function openDetail(holeId) {
    setHoveredId(holeId);
    setDetailId(holeId);
  }

  // refetch when the filters change, with a short pause so we aren't
  // hitting the API on every keystroke
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHoles([]);
    setError(null);
    const timer = setTimeout(() => {
      getHoles({ search, anomaliesOnly })
        .then((data) => {
          if (cancelled) return;
          setHoles(data);
        })
        .catch((err) => !cancelled && setError(err.message))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, anomaliesOnly]);

  return (
    <div className="columns">
      <div className="sidebar">
        <div className="search-row">
          <input
            type="search"
            placeholder="Search hole id or name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={anomaliesOnly}
              onChange={(event) => setAnomaliesOnly(event.target.checked)}
            />
            Only holes with flagged intervals
          </label>
        </div>

        <div className="hole-list">
          {error && <div className="error" style={{ margin: 12 }}>{error}</div>}
          {loading && <p className="hint" style={{ margin: 12 }}>Loading holes…</p>}

          {!loading && !error && holes.length === 0 && (
            <p className="empty">
              No holes match the current filters.
            </p>
          )}

          {holes.map((hole) => (
            <button
              key={hole.hole_id}
              className={`hole-row ${hole.hole_id === hoveredId ? "selected" : ""}`}
              onMouseEnter={() => setHoveredId(hole.hole_id)}
              onClick={() => openDetail(hole.hole_id)}
            >
              <span className="id">{hole.hole_id}</span>
              {distinctName(hole) && <span className="name">{distinctName(hole)}</span>}
              {hole.confidential && <span className="badge confidential">confidential</span>}
              <span className="len">{hole.borehole_length_m == null ? "Length unavailable" : `${Math.round(hole.borehole_length_m)} m`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="map-area">
        <HoleMap holes={holes} selectedId={hoveredId} onHover={setHoveredId} onSelect={openDetail} flyToId={detailId} />
        <div className="legend">
          <div style={{ color: "var(--text-dim)" }}>{loading ? "Loading holes…" : error ? "Data unavailable" : `${holes.length} holes shown`}</div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--accent)" }} />
            hovered · click for details
          </div>
        </div>
      </div>

      <HoleDetail holeId={detailId} onSelect={openDetail} />
    </div>
  );
}
