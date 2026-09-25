# BPL 8 Auction 2026 — Setup Guide (free, no credit card)

This is a real multi-device live auction: the admin runs the draw from a laptop/projector,
each of the 8 captains bids from their own phone, and everyone sees the same live state.
Total cost: **₹0**, using Firebase's free Spark plan + free static hosting.

## Project layout
- `site/` — the deployed app (this is the only folder Netlify/GitHub Pages needs to serve).
- `tests/`, `tools/` — unit tests and the local dev server (`npm test`, `npm run serve`).
- `source-assets/` — original sponsor logo/banner/video files (not deployed directly; the
  processed copies used by the site live under `site/assets/`).
- `docs/` — reference documents (participant lists) not used by the app.
- `legacy/` — the earlier single-file localStorage prototype, superseded by `site/`.

## 1. Create a Firebase project (5 min)
1. Go to the Firebase console and create a new project. Decline Google Analytics (not needed).
2. Stay on the **Spark (free) plan** — do not upgrade to Blaze.
3. In the project, click **Build → Realtime Database → Create Database**. Choose any region,
   start in **locked mode**.
4. In **Realtime Database → Rules**, paste the contents of `database.rules.json` from this
   folder and click **Publish**.
5. Click **Build → Authentication → Get started**. Enable the **Email/Password** sign-in
   method.
6. Click the gear icon → **Project settings → General**, scroll to "Your apps", click the
   web icon (`</>`), register an app (any nickname). Copy the `firebaseConfig` object it
   shows you.
7. Open `site/js/firebase-config.js` in this project and paste your values in, replacing the
   `REPLACE_ME` placeholders.

## 2. Create logins for the admin and 8 captains (10 min)
1. In **Authentication → Users → Add user**, create one user for yourself, e.g.
   `admin@bpl8.local` with a password you choose.
2. Click on the new user row and copy their **User UID**.
3. In **Realtime Database → Data**, manually add: `admins/<paste the UID>` = `true`.
4. Repeat step 1 to create 8 more users, one per captain, e.g. `team1@bpl8.local` …
   `team8@bpl8.local`. Give each captain their own password (tell them privately —
   passwords are never stored in this project's files).
5. Copy each captain's UID (from the Users list). You will paste it into the matching
   team's **Captain login UID** field inside the admin screen in step 4 below — that is
   what links their login to their team and lets the security rules verify their bids.

## 3. Set up teams and players (in the app, once hosted or running locally)
1. Open `admin.html`, sign in as the admin user you created.
2. **Setup tab → Auction Settings**: confirm ₹1 Cr purse, ₹2 L base price, squad size 7,
   and the increment tiers, then Save.
3. **Players**: bulk-paste all 56 names (8 captains + 48 auction players), or add them one
   by one with role + photo. Tick "This player is a captain" for the 8 captains.
4. **Teams**: add all 8 teams, pick each team's captain from the dropdown, and paste in
   the captain's UID from step 2.5 above.

## 4. Deploy for free (2 min)
Pick one:
- **Netlify (Git-based, continuous deploy)** — the recommended way to keep this live season to
  season: push this repo to GitHub, then in Netlify click **Add new site → Import an existing
  project**, pick the repo, and accept the defaults. `netlify.toml` at the repo root already sets
  `publish = "site"`, so no build command is needed — every push to the default branch auto-deploys.
  ```
  git remote add origin <your-empty-GitHub-repo-URL>
  git branch -M main
  git push -u origin main
  ```
- **Netlify Drop**: go to Netlify's drop page and drag just the `site/` folder onto it. You get
  a free `*.netlify.app` URL instantly, no account or git required — good for a one-off rehearsal.
- **GitHub Pages**: push this repo to a GitHub repo, then in the repo's Settings → Pages,
  set the source to the `site/` folder on your default branch.

Share the resulting URL with your 8 captains — they open it, sign in with the email and
password you gave them, and land straight on their bidding screen. Put `display.html` up
on the projector (no login needed).

## 5. Local testing before the event
```
npm test          # runs the auction-math unit tests (node --test)
npm run serve     # serves the site/ folder at http://localhost:8080
```
Open `http://localhost:8080` in several browser windows (use one Incognito window per
captain) to rehearse a full auction before the real event. Note: local testing still talks
to your real Firebase project, since there is no backend to run locally — use a throwaway
team/player if you want to rehearse without polluting real data, and clear the Realtime
Database data before the actual auction starts.

## Notes
- Money is stored in whole rupees. ₹1 Cr = 10,000,000. ₹2 L = 200,000.
- Photos are stored directly in the Realtime Database (compressed to ~80KB each), not in
  Firebase Storage — Storage now requires the paid Blaze plan, RTDB doesn't.
- If a captain's browser loses connection mid-bid, the security rules (not just app code)
  are what actually stop anyone from writing an invalid bid — but this is a friendly
  auction tool, not a financial system, so no penetration testing was done beyond the
  rules described in `database.rules.json`.
