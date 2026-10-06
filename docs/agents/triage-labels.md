# Triage Labels

The skills speak in terms of five canonical triage roles. This repo's tracker is `TODO.MD` (local and gitignored, see `issue-tracker.md`), which has no labels: each role is a section of `TODO.MD` instead. "Apply a label" means moving the bullet into that section.

| Label in mattpocock/skills | In our tracker (`TODO.MD` section)     | Meaning                                  |
| -------------------------- | -------------------------------------- | ---------------------------------------- |
| `needs-triage`             | `ideas`                                | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs danny`                          | Waiting on reporter for more information |
| `ready-for-agent`          | `up next (claude)`                     | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `needs danny`                          | Requires human implementation            |
| `wontfix`                  | a `left on purpose` line, or delete it | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), move the bullet to the matching section from this table.
