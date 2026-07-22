---
name: open-pr
description: Take a Linear ticket through to an open PR - fetch and display the ticket, draft an implementation plan, confirm it with the user, then branch off main, implement, and open the PR with gh. Use when asked to "open a PR for <ticket>", "implement MHE-<number>", "start work on this Linear ticket", or similar.
---

Turns one Linear ticket into one open PR against `main`, with an explicit
plan-confirmation gate in between. Nothing gets branched, implemented, or
pushed until the user has approved the plan.

## Step 1 — Fetch the ticket

Tools are `mcp__claude_ai_Linear__*`. If only `authenticate` /
`complete_authentication` are visible (no issue/search tools), Linear
isn't connected yet — ask the user to run `/mcp` and select "claude.ai
Linear", then retry. Once connected, the server exposes its own
issue-fetching tools dynamically; their exact names aren't fixed, so
look them up with:

```
ToolSearch({query: "Linear issue", max_results: 10})
```

Fetch the ticket by ID or URL the user gave you (e.g. `MHE-24` or a
`linear.app/.../issue/MHE-24/...` link).

## Step 2 — Display the ticket

Show the user: ticket ID, title, full description, and any acceptance
criteria/labels. Don't summarize away detail — this is their chance to
notice if the wrong ticket got pulled.

## Step 3 — Plan

Use `EnterPlanMode` to explore the codebase and draft the implementation
approach (this repo's own `CLAUDE.md` has the architecture map: backend
routes under `backend/routes/`, frontend screens under
`frontend/src/screens/`, scoring in `backend/metricCalc.js`, etc.).

Surface any open questions as you go — ambiguous acceptance criteria,
a choice between two valid approaches, a missing detail in the ticket —
via `AskUserQuestion` **before** calling `ExitPlanMode`. Don't guess and
proceed; the whole point of this step is to catch mismatches before code
gets written.

Call `ExitPlanMode` when the plan is ready. That call itself is the
confirmation gate — do not proceed past it until the user approves.

## Step 4 — Branch off main

Only after the plan is approved:

```bash
git status --short   # must be clean, or stash/ask first
git checkout main
git pull origin main
```

Compute the branch name with the helper script (matches this repo's
existing convention, e.g. `kpbala/mhe-17-fitbit-access-token-...`):

```bash
.claude/skills/open-pr/branch-name.sh "<TICKET-ID>" "<ticket title>"
```

```bash
git checkout -b "$(.claude/skills/open-pr/branch-name.sh "MHE-24" "Fix nutrition score not saving after reassessment")"
```

## Step 5 — Implement

Follow the approved plan and this repo's conventions (`CLAUDE.md`):
camelCase backend filenames, PascalCase frontend components, snake_case
DB columns, routes mounted under `/api/` in `backend/app.js`. Implement
in the order the plan laid out; if reality diverges meaningfully from
the plan (a file doesn't exist, an assumption was wrong), stop and tell
the user rather than silently improvising past it.

## Step 6 — Commit

One or more commits as appropriate to the change size. Reference the
ticket ID in the message (matches existing history, e.g. `MHE-16,
MHE-22, MHE-23: Fix Fitbit disconnect, JWT TTL, and reconnect UX`).
Follow the git-commit safety rules already in scope (no `-A`/`.`
staging, no secrets, `Co-Authored-By` trailer).

## Step 7 — Push and open the PR

```bash
git push -u origin HEAD
gh pr create --base main --title "<TICKET-ID>: <short summary>" --body "$(cat <<'EOF'
## Summary
- <what changed and why, tied to the ticket>

## Linear
<ticket URL or ID>

## Test plan
- [ ] <manual/automated verification steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL back to the user.

## Gotchas

- `gh` auth and the `origin` remote were verified working in this repo
  (`ucsfdigitalhealth/mHealthy_hearts`, default branch `main`) — if `gh
  auth status` ever fails, that's an environment issue, not a skill bug.
- The branch-naming convention combines multiple ticket IDs on rare
  occasion (e.g. `mhe-16-22-23-...` for one PR closing three tickets).
  `branch-name.sh` only handles the single-ticket case; for a
  multi-ticket PR, construct the branch name by hand following the same
  pattern instead of forcing it through the script.
