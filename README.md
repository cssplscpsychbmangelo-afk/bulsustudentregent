# CSSP Room Finder (rCloud integration)

A drop-in classroom schedule viewer for rCloud.

## What's delivered

| File | Purpose |
|---|---|
| `assets/css/roomfinder.css` | Scoped layout CSS. **No custom colors/fonts/bg** — it inherits typography, text color, link color, and background from the host page. Layout only (grids, chip rows, timeline, badges, responsive breakpoints, dark-mode aware via system colors). |
| `assets/js/roomfinder.js` | All functionality. Loads `/data/cssp-schedule.json` once (with `localStorage` cache for 12h) and does all search/filter/sort/availability client-side. Renders into `<div id="room-finder"></div>`. |
| `data/cssp-schedule.json` | Static schedule dataset. Replace with the official CSSP schedule; set `"isSample": false`, update `"updated"` and `"source"`. |
| `RoomFinderClient.jsx` | Next.js App Router client-component wrapper. See integration steps below. |
| `index.html` | Standalone demo page (just shows the component on a plain page so you can preview behavior without the rCloud shell). |

## Features (all required items)

- Find a Room (by day + time)
- Find a Class (search course/section/instructor/room)
- What's Free Right Now (uses browser local time)
- Where Is My Class (course/section lookup)
- Full Schedule (sortable table → cards on mobile)
- Room detail: current status, next/last class, full-day timeline with gaps filled as "Available"
- Three state badges: Available / Occupied / No class (dot + text, never color-only)
- Day chips (MON–SAT, only days present in the data)
- Time chips (Now + hourly 7 AM–8 PM, plus "available/occupied" toggles)
- Offline/low-connection banner using cached data
- Schedule metadata (updated date + source) + sample-data warning
- Disclaimer about availability (no claim rooms are physically free)
- Empty states
- Keyboard accessible, focus-visible rings, `prefers-reduced-motion` respected

## Integrating into the rCloud Next.js site

1. Copy files into the repo:

   ```
   public/assets/js/roomfinder.js      ← assets/js/roomfinder.js
   public/data/cssp-schedule.json      ← data/cssp-schedule.json  (replace with real schedule)
   app/room-finder/roomfinder.css      ← assets/css/roomfinder.css
   app/room-finder/RoomFinderClient.jsx← RoomFinderClient.jsx
   ```

2. Create the page at `app/room-finder/page.js`:

   ```jsx
   import "./roomfinder.css";
   import RoomFinder from "./RoomFinderClient";

   export const metadata = { title: "Room Finder · rCloud" };

   export default function RoomFinderPage() {
     return (
       <>
         <p className="back-link">
           <a href="/">&larr; Back to Home</a>
         </p>
         <RoomFinder />
       </>
     );
   }
   ```

   No other styling is needed. The component inherits rCloud's existing body font, heading font, link color, and background from the site's root layout because the scoped CSS uses `inherit`, `Canvas/CanvasText`, `AccentColor`, `LinkText`, `Highlight`, and `ButtonFace` system colors. RCloud's Fraunces headings, Inter body, violet link color, and cream/ink palette all pass through automatically.

3. Deploy. When the schedule changes, replace `public/data/cssp-schedule.json` — no rebuild required beyond Netlify picking up the new static file.

## Optional: custom data URL

If you host the schedule at a different path, pass it as a prop:

```jsx
<RoomFinder dataUrl="/some/other/path.json" />
```

Or set `window.ROOMFINDER_DATA_URL` before the script loads.

## Notes

- No network requests after the initial JSON load. No tracking, no accounts, no user data.
- All badges/labels include text (not just color dots), so they're accessible for color-blind users and screen readers.
- Mobile-first: grids collapse to one column, tables become cards under 640px.
