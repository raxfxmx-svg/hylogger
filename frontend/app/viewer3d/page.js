"use client";

// Pick a few holes and look at them underground.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getHoles, getNearby, getTrace } from "@/lib/api";
import { DEFAULT_VERTICAL_EXAGGERATION } from "@/config";
import { distinctName } from "@/lib/format";
import CoreStripPanel from "@/components/CoreStripPanel";

const Hole3D = dynamic(() => import("@/components/Hole3D"), { ssr: false });

const MAX_HOLES = 12; // keeps it readable and the browser happy

export default function Viewer3DPage() {
  const [holes, setHoles] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [traces, setTraces] = useState([]);
  const [exaggeration, setExaggeration] = useState(DEFAULT_VERTICAL_EXAGGERATION);
  const [colourBy, setColourBy] = useState("mineral");
  const [holesError, setHolesError] = useState(null);
  const [traceError, setTraceError] = useState(null);
  const [neighbourError, setNeighbourError] = useState(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [neighboursLoading, setNeighboursLoading] = useState(false);
  const [neighbourRequest, setNeighbourRequest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHoles()
      .then((data) => {
        if (cancelled) return;
        setHoles(data);
        if (data.length) setChosen([data[0].hole_id]);
      })
      .catch((err) => !cancelled && setHolesError(err.message));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTraces([]);
    setTraceError(null);
    setTracesLoading(Boolean(chosen.length));
    if (chosen.length) {
      Promise.all(chosen.map((holeId) => getTrace(holeId)))
        .then((data) => !cancelled && setTraces(data))
        .catch((err) => !cancelled && setTraceError(`Could not load selected holes: ${err.message}`))
        .finally(() => !cancelled && setTracesLoading(false));
    }
    return () => { cancelled = true; };
  }, [chosen]);

  useEffect(() => {
    setNeighbourError(null);
    setNeighboursLoading(false);
    // A selection change invalidates the pending addition, including clearing
    // the selection or choosing a different anchor while the lookup is running.
    if (!neighbourRequest || neighbourRequest.selection !== chosen || !chosen.length) return;
    let cancelled = false;
    setNeighboursLoading(true);
    getNearby(chosen[0], 100)
      .then((nearby) => {
        if (cancelled) return;
        setChosen((current) => current !== chosen ? current :
          [...new Set([...current, ...nearby.slice(0, 5).map((h) => h.hole_id)])].slice(0, MAX_HOLES)
        );
      })
      .catch((err) => !cancelled && setNeighbourError(`Could not add nearest holes: ${err.message}`))
      .finally(() => !cancelled && setNeighboursLoading(false));
    return () => { cancelled = true; };
  }, [chosen, neighbourRequest]);

  function toggle(holeId) {
    setChosen((current) =>
      current.includes(holeId)
        ? current.filter((id) => id !== holeId)
        : [...current, holeId].slice(-MAX_HOLES)
    );
  }

  /** Add the closest handful of holes to whatever is already selected. */
  function addNeighbours() {
    if (!chosen.length) return;
    setNeighbourRequest({ selection: chosen });
  }

  return (
    <div className="columns">
      <div className="sidebar">
        <div className="search-row">
          <p className="section-title">Holes in view</p>
          <p className="hint">
            Up to {MAX_HOLES}. Drag to rotate, scroll to zoom.
          </p>
          <button
            className="action"
            style={{ marginTop: 10, width: "100%" }}
            onClick={addNeighbours}
            disabled={!chosen.length || neighboursLoading}
          >
            {neighboursLoading ? "Finding nearest holes…" : "Add 5 nearest holes"}
          </button>
        </div>

        <div className="hole-list">
          {[holesError, traceError, neighbourError].filter(Boolean).map((message, index) => (
            <div key={index} className="error" style={{ margin: 12 }}>{message}</div>
          ))}
          {tracesLoading && <p className="hint" style={{ margin: 12 }}>Loading selected holes…</p>}
          {holes.map((hole) => (
            <button
              key={hole.hole_id}
              className={`hole-row ${chosen.includes(hole.hole_id) ? "selected" : ""}`}
              onClick={() => toggle(hole.hole_id)}
            >
              <span className="id">{hole.hole_id}</span>
              {distinctName(hole) && <span className="name">{distinctName(hole)}</span>}
              <span className="len">{hole.borehole_length_m == null ? "Length unavailable" : `${Math.round(hole.borehole_length_m)} m`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="map-area">
        <Hole3D
          traces={traces}
          holes={holes}
          verticalExaggeration={exaggeration}
          colourBy={colourBy}
        />

        <div className="controls-3d">
          <p className="section-title">Colour by</p>
          <select value={colourBy} onChange={(event) => setColourBy(event.target.value)}>
            <option value="mineral">Mineral</option>
            <option value="anomaly">Anomaly score</option>
          </select>

          <p className="section-title" style={{ marginTop: 14 }}>
            Depth stretch ×{exaggeration}
          </p>
          <input
            type="range"
            min="1"
            max="80"
            value={exaggeration}
            onChange={(event) => setExaggeration(Number(event.target.value))}
          />
          <p className="hint" style={{ marginTop: 6 }}>
            Real holes are kilometres apart and only metres wide, so depth is
            stretched to make them visible. Set this to 1 for true scale.
          </p>
        </div>

        <CoreStripPanel holeId={chosen[0]} />
      </div>
    </div>
  );
}
