# Deployment (Vercel)

Knowra deploys on **Vercel** using its native Git integration — every push is built and deployed
automatically, with no deploy step in GitHub Actions. (CI in `.github/workflows/ci.yml` still runs
lint/typecheck/tests/build on `main`, `dev`, and `prod` and on PRs to them.)

## Branch → environment model

| Branch         | Vercel deployment                 | Use                                            |
| -------------- | --------------------------------- | ---------------------------------------------- |
| `prod`         | **Production** (your main domain) | Released, stable builds                        |
| `dev`          | **Preview**                       | Integration branch — the shared staging deploy |
| `main`         | Preview                           | Retained trunk (optional in the deploy flow)   |
| `feat/*` (PRs) | Preview (one URL per PR)          | Per-change previews, auto-commented on the PR  |

Vercel treats the configured **Production Branch** specially and deploys every _other_ branch as a
Preview. We set the Production Branch to **`prod`**, so `dev` (and feature branches) deploy as
Previews automatically.

**Release flow:** feature branch → PR into `dev` (preview) → merge → promote `dev` → `prod` (via a
PR) to ship to Production.

## One-time setup (Vercel dashboard)

1. **Import the repo** — [vercel.com/new](https://vercel.com/new) → import `bhattshrey24/knowra`
   → authorize the Vercel GitHub app for this repo. Framework auto-detects as **Next.js**; keep
   the default build (`next build`) and output settings.
2. **Set the Production Branch** — Project → **Settings → Git → Production Branch** → set to
   **`prod`** → Save. (Now `dev` and feature branches deploy as Previews.)
3. **Add environment variables** — Project → **Settings → Environment Variables**. Add these for
   **Production _and_ Preview** (values from your Supabase project; never commit them):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)
   - `LLM_PROVIDER` = `mock` for now (set to `gemini` + add `GOOGLE_GENERATIVE_AI_API_KEY` to use Gemini)
4. **Redeploy** the latest `prod` and `dev` so they pick up the env vars (Deployments → ⋯ →
   Redeploy), or just push.

## Notes

- **Supabase auth:** in Supabase → Authentication → URL Configuration, set the **Site URL** to your
  Vercel production domain and add the preview domains to the redirect allow-list if you later add
  email-based auth. Anonymous sign-in works without redirect URLs.
- **Runtime:** Vercel uses Node 22 by default, which satisfies `@supabase/supabase-js` natively (the
  `ws` transport we ship is harmless there and keeps Node 20 working locally/CI).
- **Plan/cost:** the Hobby plan is free and non-commercial — fine for this hackathon demo. A real
  commercial deployment needs Vercel Pro. See `improve.md` / the plan.
- **Free-tier pause:** the Supabase project pauses after ~7 days idle — un-pause it from the
  Supabase dashboard before a demo, or the deployed app can't reach the database.
