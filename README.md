# Eastledge Interiors — Fortnight wages

Mobile-friendly web app for booking fixer wages every two weeks.

## What it does

- Fixers sign in on their phone and submit **one claim per fortnight**
- Job rates are set only by the site owner
- Fixers pick a job, enter hours/quantities, and can add variations
- Nothing is paid until the owner reviews each line (approve / change / reject)
- Approved lines become the wage sheet for that fortnight

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data is stored in `data/eastledge.db` (SQLite).

## Demo logins

| Role | Name | PIN |
|------|------|-----|
| Owner | Site Owner | 0000 |
| Fixer | Sam Reid | 1234 |
| Fixer | Jordan Lee | 1234 |
| Fixer | Alex Morgan | 1234 |

## Stack

Next.js (App Router), SQLite (`better-sqlite3`), cookie sessions.
