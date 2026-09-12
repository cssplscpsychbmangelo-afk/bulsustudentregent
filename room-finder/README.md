# CSSP Room Finder (Roomivility)

A lightweight, student-facing classroom schedule viewer for rCloud.

- **Static dataset + client-side search.** Once the schedule JSON loads, all filtering, searching, sorting, and availability checks happen entirely in the student's browser.
- **No database.** No per-search network requests. No WebSockets. No polling.
- **Anonymous.** No accounts, no tracking, no user data collection.
- **Offline-tolerant.** After first load, the schedule is cached in `localStorage` (12h TTL). Students with flaky connections keep using the cached copy with a visible notice.

## Files

```
/
├── index.html                    rCloud home
├── room-finder/
│   └── index.html                Room Finder page
├── assets/
│   ├── css/styles.css            Visual identity (dark purple / violet)
│   └── js/roomfinder.js          All search/filter logic (vanilla JS, no deps)
└── data/
    └── cssp-schedule.json        ← Replace this with the official schedule
```

## Updating the schedule

To update the schedule you do **NOT** need to rebuild the website.

1. Replace `/data/cssp-schedule.json` with the new official schedule.
2. Update `metadata.updated` (date, e.g. `2026-09-12`) and `metadata.source`.
3. Set `metadata.isSample` to `false` once you are publishing real data.
4. Deploy. Browsers will fetch the new JSON the next time a student loads the page (and then cache it locally for up to 12 hours).

### Expected JSON shape

```jsonc
{
  "metadata": {
    "title": "CSSP Class Schedule",
    "institution": "Bulacan State University — College of Social Sciences and Philosophy",
    "updated": "2026-09-12",                 // ISO date string
    "source": "Office of the College Secretary",
    "isSample": false,
    "disclaimer": "Room availability is based on the published class schedule and does not guarantee physical access or availability.",
    "rooms": ["201", "202", "203", "301"],   // optional; otherwise derived
    "buildings": [{ "code": "CSSP", "name": "CSSP Main Building" }]
  },
  "schedule": [
    {
      "day": "Monday",                      // Monday–Sunday
      "start": "08:00",                     // 24h HH:MM
      "end": "09:30",
      "course": "PSY 101",
      "section": "BSP 3A",
      "room": "301"
      // "instructor": "Dr. ..."            // optional
      // "building": "CSSP"                 // optional (shown if present)
    }
  ]
}
```

Only include fields that actually exist in the official source. **Do not fabricate data.**

## Features implemented

- Quick search (room, class, section) — instant, local
- Day filter (MON–SAT; only days present in the dataset are shown)
- Time filter (Now + hourly slots; “Currently Available” / “Currently Occupied” quick toggles)
- “What's Free Right Now?” using the browser's local time
- “Where Is My Class?” course/section lookup
- Room detail: current status, next/last class, full day timeline (availables filled in)
- Sortable schedule table (transforms into cards on mobile)
- Schedule version + source + disclaimer in the footer
- Offline banner when using cached data
- Empty states (no rooms / no classes / no schedule data for day)
- 3-state room status: 🟢 AVAILABLE / 🔴 OCCUPIED / ⚪ NO SCHEDULED CLASS

## Deployment notes (Netlify free tier)

- The entire site is static HTML/CSS/JS + one small JSON file. Deploy as a static site.
- Nothing is server-rendered. No functions needed for the Room Finder itself.
- No large calendars or scheduling libraries are used (custom time logic, ~12KB JS).
- Netlify will cache `/data/cssp-schedule.json` according to default CDN rules; if you need instant refreshes after an update, you can add a cache-busting rule in `netlify.toml` (optional).
