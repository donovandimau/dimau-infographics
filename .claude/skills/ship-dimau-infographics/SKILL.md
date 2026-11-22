---
name: ship-dimau-infographics
description: Ship a change to the Dimau Infographics repo and record it — branch, commit, draft pull request, stacked PRs, watching checks, waiting for Donovan's merge, verifying the live library at infographics.dimau-fintech.com, the follow-up TRACKER PR and the Ops Room card. Use at the end of any change in this repo, or when asked to merge, check production or tidy up after a merge.
---

# Ship and record a change

## Rules that never bend
- Work on a branch and open a **draft** PR. **Never merge it yourself**, never push to `main`, never use auto-merge: Donovan merges. (An agent's merge attempt is refused as "merge without review"; don't retry it.)
- `TRACKER.md` is updated in the **same commit** as the work: status line, template list and count, rules, and a **Done** entry at the top.
- Inside `public/v1/` nothing breaks: no renamed templates, removed options or changed event payloads. Additive loader changes bump the version; breaking ones go in `/v2/`.
- No model names in commits, PR titles or bodies. Never print or commit secrets. Treat the owner's email as private.

## Commit and PR
- Commit message: one summary line, a short body saying what changed and why, then the attribution lines your harness gives you.
- PR: `gh api repos/donovandimau/dimau-infographics/pulls -f title=… -f head=<branch> -f base=main -F draft=true -F body=@body.md`. The body says what each template or change does in plain words, what the sample data is (real with source, or example), what was **not** done, and the checks run (`npm test` count at 1360px and 390px, screenshots looked at). End it with the harness's PR attribution.
- **Stacked work:** if the earlier PR isn't merged, branch from it and start the body with "Builds on PR #N — merge it first; until then this diff also shows its changes." Merge order goes in the Ops card. When Donovan merges the later PR first, GitHub closes the earlier one as merged too — that is fine.
- The `keep-prs-mergeable` workflow merges `main` into open PRs (TRACKER uses `merge=union`). If you merge main in by hand, never rebase or force-push.

## While the PR is open
- Subscribe to the PR's activity. Expected bot events: the Vercel/Cloudflare preview comment and `check_suite.completed`. Report briefly once checks are green; don't narrate every bot edit.
- Automated reviewers (Graphify and others) are advice: check each finding against the code before acting, and say what you found.
- If the owner hasn't written since the PR went up, one quiet check-in about 50 minutes later is enough; if nothing changed, stop and say so once.
- Check mergeability with `gh api repos/donovandimau/dimau-infographics/pulls/<n> --jq .mergeable_state` and, for stacked branches after a merge, `git merge-tree --write-tree origin/main origin/<branch>`.

## After Donovan merges
1. **Verify production.** The static library (`/v1/`, `/templates/`, `/catalog.json`) is served by the Cloudflare Worker `dimau-infographics` (`wrangler.jsonc`, static assets from `public/`) at **https://infographics.dimau-fintech.com**; Workers Builds deploys every merge to `main` within a few minutes. The Vercel account is switched off, so `dimau-infographics.vercel.app` and the Vercel tools are not the source of truth any more. The cloud container's proxy blocks that host for `curl`, so use a web-fetch tool (for example a scrape with `maxAge: 0`) on:
   - `/v1/dimau-infographics.js?v=<version>` — `VERSION` must be the new version and the new `TEMPLATES` lines present;
   - one new file, e.g. `/templates/<id>/sample-data.js` or `/v1/<file>.css` — must be 200 and match `main`.
   If it isn't live yet, schedule one check in about 5 minutes rather than polling. If the deploy failed, report it to Donovan with what you saw; don't guess.
2. **Follow-up TRACKER PR** from fresh `origin/main` (`tracker-v<version>` branch): change the status line from "on branch X, in review, not live" to "merged <date> as PR #N, verified on production". TRACKER-only, draft, ready for Donovan to merge.
3. **Ops Room card** `platform-dimau-infographics` (the Ops Room's Supabase project, table `ops_project_state`, row `project_id = 'platform-dimau-infographics'`), updated with the Supabase connector's SQL tool — never with `curl` from the shell. Keep `stage`, `next_action` (merge order of open PRs first, then the standing items), `last_activity_note`, `last_activity_at`/`updated_at = now()`, `updated_by = 'claude'`, `open_pr_count` and `merge_detail` (`{"open":[{url, head, draft, title, number}], "repo": "dimau-infographics"}`) true to GitHub.

## Standing items to keep on the card until done
- v2 setup: env vars from `.env.example`, then `supabase/migrations/001_infographics_fiji.sql` and `supabase/seed.sql` (Donovan).
- A fluent speaker to check the Fijian words in Flashdeck and Sorter (Donovan).
- Apps adopting templates, each recorded in that template's `catalog.json` `usedBy`.
