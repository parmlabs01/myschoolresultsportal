# Phase 2 — Public student portal

Wired to your Supabase project (`nswrbxxeucyaqijfxcqh`) via `.env.local`,
which already has the URL + publishable/anon key filled in. That key is
meant to be public/client-side — it only works within the RLS policies and
RPC grants from Phase 1, so it can't read students/results/pins directly.

## Run it

```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## What's here

- `src/pages/Home.tsx` — header, hero, and the result-check card: school
  search → session → term → 8-digit PIN → `supabase.rpc('verify_and_fetch_result', ...)`
- `src/components/PinInput.tsx` — the "0000 0000" grouped PIN field
- `src/components/ResultSlip.tsx` — the digital result slip: school
  branding, student info, subject table, summary, attendance, remarks,
  print/download/share actions. `window.print()` is wired for both Print
  and Download PDF for now — true "Download PDF" (a generated file rather
  than the browser print dialog) is a good candidate for Phase 3 alongside
  the school dashboard, since a clean PDF export usually wants a small
  serverless function rather than client-only code.
- Design tokens: navy/blue-and-paper palette, Source Serif 4 for headings
  (evokes an official transcript) + IBM Plex Sans for UI — set in
  `tailwind.config.ts`.

## One thing worth flagging

`verify_and_fetch_result` is called with `p_ip: null` right now. Real IP
based rate-limiting needs a request header a browser can't see or fake —
in Phase 3, when you're on Vercel, the cleanest path is a small Edge/Serverless
function that reads `x-forwarded-for` and calls the RPC server-side, rather
than calling Supabase directly from the browser for this one call. Happy to
wire that in when we get to deployment.

## Test data

If you ran `004_seed.sql`, you can test the whole flow with:
- School: **Demo Comprehensive College**
- Session: **2025/2026**, Term: **First Term**
- PIN: **12345678**

## Next: Phase 3

Auth (`/auth`) + the school dashboard — student management, subjects,
sessions, manual + CSV result entry, and the publish flow. Say the word
when you're ready and I'll start there.
