# Issue tracker: TODO.MD

Work for this repo is tracked in `TODO.MD` at the repo root. There are no GitHub issues and no PRs: this is a solo project and changes go straight to `main`.

## Conventions

- Plain indented lists, lowercase, no checkboxes.
- Sections, in order:
  - `needs danny`: content and decisions only Danny can supply.
  - `up next (claude)`: agent-ready work. Each top-level bullet is one ticket.
  - `waiting on …`: blocked work, with what it's waiting on.
  - `future improvements/features`, `ideas`: not yet scoped.
  - `done (…)`: finished work, one line per batch, dated, with the commit or PR where useful.
- A ticket's sub-bullets hold its details, its blockers ("after …") and links to plans.

## When a skill says "publish to the issue tracker"

Add a bullet under `up next (claude)`, or under `needs danny` if it needs Danny's input. For a multi-session effort, put the spec under `.scratch/<feature-slug>/spec.md` and link it from the bullet.

## When a skill says "fetch the relevant ticket"

Read `TODO.MD` and find the bullet the user named. Read any plan or spec it links.

## When a ticket is done

Delete it from its section and add a dated line to `done`. Do this in the same commit as the work.
