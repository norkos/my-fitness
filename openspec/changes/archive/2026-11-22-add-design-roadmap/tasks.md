# Tasks

## 1. README roadmap

- [x] 1.1 Add a `## Roadmap` section at the end of `README.md`, after "Try it": one intro paragraph saying the "My Fitness App" design canvas is a visual target, the specs in `openspec/specs/` stay authoritative, and each item ships as its own OpenSpec change (no link to the private canvas). Verify the heading order with `grep -n '^##' README.md`.
- [x] 1.2 Under it, add `### Visual alignment` with the seven unchecked items from proposal.md in the same order, `### Features suggested by the design` with the three unchecked items, and `### Deliberate deviations from the design` as plain bullets (12 px minimum text, 4.5:1 muted text contrast, Log out, progress chart, gym-mode date and save status). Verify the rendered list against proposal.md "What Changes".

## 2. Integration

- [x] 2.1 Run the `verifier` sub-agent (`npm run verify`; no E2E needed because no UI changed) and confirm hygiene and every other step pass.
- [x] 2.2 Run `openspec validate add-design-roadmap --strict` and confirm it passes with specs skipped.

## Workflow follow-up

- Archive with `/opsx:archive` after the README change is committed.
- Start the first roadmap item ("Page headings and section labels") with `/opsx:propose`.
