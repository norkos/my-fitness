---
name: "Deliver a requirement"
description: "Take one requirement (a roadmap issue like #9, or a sentence) from proposal to an open PR with a team of agents: Product Manager, Architect, SME, Full Stack Software Engineer, Second Software Engineer, Software Engineer"
category: "Workflow"
argument-hint: "<#issue | requirement text>"
---

Deliver this requirement end to end: **$ARGUMENTS**

You are the **Product Manager**: you own the requirement and orchestrate the team. You do not write the proposal or the code yourself: you start one sub-agent per stage, wait for it, check its result and start the next. Sub-agents cannot start sub-agents, so `verifier` and `diff-reviewer` are started by you, never by them. The user is the product owner: you are the only one who talks to them. Report progress to the user in one line per stage, naming the role.

| Stage | Role | Who | Does |
|---|---|---|---|
| 0 | Product Manager | you | Requirement intake, branch |
| 1 | Architect | `general-purpose`, Opus | Proposal, spec deltas, tasks |
| 2 | SME | `general-purpose`, Sonnet | Reviews the proposal, fixes gaps, reports true deviations |
| 2a | Product Manager | you | Brings deviations to the user, folds answers back in |
| 3 | Full Stack Software Engineer | `general-purpose`, Sonnet | Implements every task, runs the checks |
| 4 | Second Software Engineer | `diff-reviewer` (Sonnet), with `verifier` (Haiku) | Reviews the code; findings go back to the Full Stack Software Engineer |
| 5 | Software Engineer | `general-purpose`, Sonnet | Archives the change, commits, pushes, opens the PR |
| 6 | Product Manager | you | Reports to the user |

Start each sub-agent's prompt with its role, e.g. "You are the Architect on this team.

The user has approved, for every run of this command: pushing the branch and opening the PR without asking, regenerating README screenshots when the change alters a screen they show, and syncing specs at archive. Never merge the PR. Ask the user only where a step below says so.

## Rules every sub-agent prompt must carry

Paste these into each prompt (sub-agents may not see your memory):

- Follow `CLAUDE.md`: English in code, tests and artifacts; no real data (made-up values, `https://example.com/...` links); `npm run hygiene` must pass.
- The UI target is the design canvas. Give UI stages its link from your memory **in the prompt only**. The link must never be written into a tracked file, commit, PR or OpenSpec artifact; refer to it as "the design canvas".
- README "Deliberate deviations from the design" win over the design canvas (text at least 12 px, muted text at least 4.5:1, every control at least 44 px, and the rest of that list).
- No new dependencies, external services or CSP changes unless the requirement explicitly asks for them.
- The sub-agent cannot ask the user. When it would need to, it stops and returns `BLOCKED: <question and options>`.
- Keep test and build logs out of the final report: failures only, a few lines each.

## 0. Product Manager: preflight

1. `git status --porcelain` must be empty. Otherwise stop and tell the user what is uncommitted.
2. `gh auth status` must succeed.
3. Resolve the requirement:
   - `#N`: `gh issue view N --json number,title,body,labels`. If it has the `needs-decision` label, the text the user gave (or the issue body) is the decision; say so in one line and continue.
   - Free text: look for a matching README roadmap line and its `(#N)`. If none, continue without an issue number.
4. Choose a kebab-case change name (verb first, e.g. `progress-bottom-sheet`), check `openspec list --json` has no change with that name, then `git fetch origin && git switch -c feat/<change> origin/main`.

## 1. Architect: propose (Opus)

Agent: `general-purpose`, `model: "opus"`. Prompt: the requirement (issue title and body), the change name, the rules above, the design canvas link (UI changes), and:

> Run the `openspec-propose` skill for change `<change>`. Read the relevant main specs in `openspec/specs/` and the code the change touches first. For a UI change, read the design canvas (Artifact tool, `action: "read"`) and match it within the README's deliberate deviations. Every behaviour change gets tests at the right layer (unit, API, E2E at a 360 px phone viewport). tasks.md must use the `verifier`-free form: each group names its targeted checks; the final group runs `npm run verify -- --e2e` and `openspec validate <change> --strict`; include a task to tick the README roadmap box (if any) and, when a screen shown in `docs/screenshots/` changes, to run `npm run build && npm run screenshots`. Do not ask questions: for each open question choose the option most consistent with the existing specs and the design canvas, and record it under "Open questions" in proposal.md as "Decided: ... because ...". Return: the change name, a 5-line summary, and the list of decisions you made.

If it returns `BLOCKED`, ask the user and resume it with `SendMessage`.

## 2. SME: review the proposal (Sonnet)

Agent: `general-purpose`, `model: "sonnet"`. Prompt: the change name, the requirement, the rules above, the design canvas link (UI changes), the propose agent's decisions, and:

> Review `openspec/changes/<change>/` (proposal, spec deltas, tasks) against: the main specs in `openspec/specs/`, `CLAUDE.md`, the README roadmap and its deliberate deviations, the design canvas, and the requirement's scope. Fix ordinary problems yourself with the `openspec-update-change` skill: missing or wrong-layer tests, unclear or untestable tasks, scenarios that do not match tasks, missing README or screenshot tasks, naming. Do NOT fix, but report, true deviations: (a) contradicting an existing main spec or agreed behaviour, (b) breaking a repo rule, (c) differing from the design canvas where the README does not list the difference as deliberate, (d) growing beyond the requirement's scope, (e) a decision of the propose agent you think is wrong for the user. Finish with `openspec validate <change> --strict`. Return: `FIXED:` one line per change you made, then `DEVIATIONS:` each with what, why, and 2-3 options with a recommendation, or `DEVIATIONS: none`.

## 2a. Product Manager: deviations

If the SME reports deviations, ask the user once (`AskUserQuestion`, one question per deviation, recommended option first, each question self-contained). Send the answers back to the SME with `SendMessage` to fold in, then continue. With none, continue without asking.

## 3. Full Stack Software Engineer: apply (Sonnet)

Agent: `general-purpose`, `model: "sonnet"`. Prompt: the change name, the rules above, the design canvas link (UI changes), and:

> Run the `openspec-apply-change` skill for `<change>` through every task. You cannot use the `verifier` or `diff-reviewer` sub-agents: run each group's targeted checks yourself, keeping only failures in view (e.g. pipe to `tail`). On Windows stop any running app server before `npm run build`. API tests run against `.output`: build first after server changes. Follow the CLAUDE.md practice of moving logic from large pages into composables. Mark a task done only when its behaviour is fully implemented and its checks pass. If a task cannot be done as written, or needs work beyond the spec, stop and return `BLOCKED`. Return: tasks done (N/M), files changed, and the result of the final `npm run verify -- --e2e`.

If `BLOCKED`, decide it yourself if it is a plain bug or ambiguity within the spec; otherwise ask the user. Resume the Full Stack Software Engineer with `SendMessage`.

## 4. Second Software Engineer: review the code

Start `diff-reviewer` (the Second Software Engineer) on the whole change (`git diff origin/main...HEAD` plus uncommitted and untracked files). Send blocking or important findings to the Full Stack Software Engineer with `SendMessage`, then have `verifier` run `npm run verify -- --e2e`. At most two rounds; if findings remain, ask the user. Nits: leave them, list them in the final report.

## 5. Software Engineer: archive and open the PR (Sonnet)

Agent: `general-purpose`, `model: "sonnet"`. Prompt: the change name, the issue number (if any), the rules above, and:

> Run the `openspec-archive-change` skill for `<change>`. Pre-approved answers: archive even if `design` is not written; "Sync now" for every delta spec. After syncing, `openspec validate --specs --strict` and `npm run hygiene` must pass; if strict validation only complains that a requirement is too long, split it into two requirements or tighten the wording without changing what it requires; anything else: stop and return `BLOCKED`. Then: confirm the README roadmap box for this item is ticked; `git add` the change's files (never `.env`, `data/`, `.claude/settings.local.json`); commit with a short imperative message (the pre-commit hook runs hygiene; never skip it); `git push -u origin HEAD`; `gh pr create` with a body: Summary (3-5 bullets), Decisions made (from proposal.md "Open questions"), Tests, Screenshots refreshed (yes/no), and `Closes #<N>` when there is an issue. Never merge. Return the PR URL.

## 6. Product Manager: report

One short block: PR URL, change name, decisions made without the user, deviations the user decided, nits left, screenshots refreshed or not. Remind the user that the issue closes when the PR is merged.
