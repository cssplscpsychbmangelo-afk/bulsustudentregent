"use client";
// Room Finder — Next.js App Router client component.
//
// USAGE:
//   1) Place this file at  app/room-finder/RoomFinderClient.jsx
//   2) Copy assets/js/roomfinder.js   →  public/assets/js/roomfinder.js
//      Copy assets/css/roomfinder.css →  app/room-finder/roomfinder.css
//      Copy data/cssp-schedule.json   →  public/data/cssp-schedule.json
//   3) In app/room-finder/page.js:
//
//        import "./roomfinder.css";
//        import RoomFinder from "./RoomFinderClient";
//        export default function Page() { return <RoomFinder />; }
//
//      (Optionally add a "Back to Home" link above it — same pattern as
//       the /resources, /projects, /about pages.)
//
// The script renders into <div id="room-finder"></div> the first time the
// component mounts. Because the CSS is loaded by the page, the component
// inherits rCloud's font/body color; the CSS only adds layout (grids,
// gaps, chip rows, timeline, badges) — no theming of its own.

import { useEffect } from "react";

export default function RoomFinder({ dataUrl = "/data/cssp-schedule.json" }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("rf-loaded")) return;

    window.ROOMFINDER_DATA_URL = dataUrl;

    const s = document.createElement("script");
    s.id = "rf-loaded";
    s.src = "/assets/js/roomfinder.js";
    s.defer = true;
    s.async = false;
    document.body.appendChild(s);
  }, [dataUrl]);

  return <div id="room-finder" />;
}
