# Par Stack

A preflop trainer, an eight-day tournament course and a results ledger for live poker
players. It works offline, and your results, hands and quiz history stay on the device.
The web app sends an anonymous visit count (GoatCounter: no cookies, no poker data),
which can be turned off in **Settings › Privacy**.

- **Web app:** https://parstack.amb.enterprises/ (install it to the home screen)
- **About and privacy:** https://amb.enterprises/parstack/
- **Android app:** this Android Studio project, which wraps the same web app

## Install the web app (iPhone or Android)

1. Open the link above on the phone.
   - **iPhone:** use **Safari**, tap **Share** (the square with the arrow), then **Add to Home Screen**.
   - **Android:** use **Chrome**, tap **Install** on the Home screen banner, or open the **⋮** menu and tap **Add to Home screen** or **Install app**.
2. Open Par Stack from the new home-screen icon and run the setup.

Install before logging results. The home-screen app keeps its own data, separate from the
browser tab. Use **Settings › Export backup** now and then.

## Build the Android app

1. In Android Studio (Panda 4 / 2025.3.4 or newer), choose **File › Open** and pick this folder. Let Gradle sync.
2. Turn on developer mode on the phone: **Settings › About phone › Software information**, then tap **Build number** seven times.
3. Turn on **Developer options › USB debugging**, or **Wireless debugging**, and connect the phone.
4. Pick the phone in the device menu and press **Run ▶**.

No connection? **Build › Generate APKs**, then copy `app/build/outputs/apk/debug/app-debug.apk`
to the phone and open it.

## What's inside

| Tab | What it does |
| --- | --- |
| Home | This month's spend against your budget; what to work on next (from your quiz misses, first-in rate, tagged leaks and decision log); what's coming up; the table counter. |
| Quiz | Fold, call or raise across seven spot types, graded against the course charts. *Smart* deals more of the spots you miss. |
| Study | The eight-day program, range charts, rules, math lessons with worked examples, and calculators: call price, steal, reshove, ICM (with satellites), par stack, bet math, stack gear. |
| Ledger | Results with buy-ins, re-entries, add-ons, cashes, finish and field. Trip costs, net, ROI, ITM, final tables and $/hour. Charts, a by-series table, the budget, a 95% range on ROI, the all-in decision log, first-in rate and a schedule with planned spend. |
| Hands | Key hands with a chart check, a decision grade kept separate from the result, and leak tags. |

## Project layout

- `app/src/main/assets/www`: the web app (plain HTML, CSS and JavaScript, no build step).
  - `js/data.js` holds the ranges, course text and default series.
  - `sw.js` is the offline cache. Bump its `VERSION` with each release.
  - `js/app.js` holds the visit counter address (`COUNTER`, a GoatCounter site).
- `app/src/main/java/ca/parstack/app/MainActivity.java`: the Android shell.
- `wrangler.jsonc`: Cloudflare publishes the web app to parstack.amb.enterprises on every push to `main`.
- `.github/workflows/pages.yml`: still publishes the old GitHub Pages copy, which now shows a "moved" banner. Delete this workflow, and the banner in `js/app.js`, once everyone has moved.

To try the web app locally, run `python3 -m http.server` inside `app/src/main/assets/www` and
open `http://localhost:8000`.

Fonts are Barlow Condensed and IBM Plex, bundled under the SIL Open Font License (see
`assets/www/fonts`).

## Licence

© 2026 AMB Enterprises Inc. All rights reserved. See `LICENSE`.
