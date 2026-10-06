# danny hu portfolio

A terminal-styled personal portfolio: one client app with a gui mode, a terminal mode and an egg-cooking minigame. These terms are the ones the code, CLAUDE.md and TODO.MD use.

## Page

**Section**:
One of the four parts of the home page, numbered 0–3: home (hero), projects, experience, skills. In the URL it's a hash (`/Portfolio/#experience`).
_Avoid_: page, tab, panel

**Frame**:
The bordered box a section is drawn in (`SectionFrame`), with its typed header on top.
_Avoid_: card, container

**Project page**:
The detail view for one project, a real pre-rendered URL (`/Portfolio/projects/<slug>/`). It replaces the section list while it's open.
_Avoid_: modal, detail popup, project route

**Popup**:
The keys popup or the more… popup, both drawn by one frame (`Popup.jsx`). While one is open it owns the keyboard and the page behind it is inert.
_Avoid_: modal, dialog, overlay (the overlay folder also holds the intro, cursor and tooltip)

**Intro**:
The boot animation, once per browser session. Deep links and reduced motion skip it.
_Avoid_: splash, loader

## Keyboard

**Stop**:
A place the j/k selection can land: a section header, a hero element (`more…`, the rules chip, the egg), or a project or experience row.
_Avoid_: focus target, item

**Selection**:
The current stop, shown inverted (no cursor) and announced by the live region. It's separate from DOM focus.
_Avoid_: focus, highlight, cursor

**Keyboard mode**:
`html.kbd`, set by any keypress and cleared by a real mouse move or any click. It pauses hover styling.
_Avoid_: keyboard focus mode

**Keys off**:
Single-character shortcuts disabled (WCAG 2.1.4), saved as `danny-keys`. Hints for one-character keys are hidden.
_Avoid_: shortcuts disabled, hotkeys off

**Key router**:
The pure module (`src/lib/keyRouter.js`) that decides what every keydown does, from the facts of the key and the page. App only reads those facts and applies the decision.
_Avoid_: key handler, keymap, shortcut handler

**Hint**:
A visible `[x]` key label next to a control (`<Hint>`).
_Avoid_: shortcut label, badge

## Shell

**Terminal mode**:
The full-screen shell (`./app --mode terminal`), with vim.
_Avoid_: cli mode, console

**Embedded shell**:
The small shell opened over the gui with the `` ` `` key (`MiniShell`).
_Avoid_: mini terminal, popup shell

**Session**:
One shell's output, history and input. There are two: `term` and `embed`.

**Shell pane**:
The output log and the prompt under it (`ShellPane`), pinned to the latest prompt. Terminal mode and the embedded shell each frame one.
_Avoid_: console, terminal view

## Motion

**Type-in**:
The once-per-load effect that types a section header and its frame's text in. Text that hasn't typed in yet is `data-fx="pending"`: still in the DOM, only made transparent.
_Avoid_: typewriter, reveal, animation

## Egg

**Egg**:
The soft-boiled egg minigame in the hero (and inline in terminal mode, `./egg`).
_Avoid_: game, minigame (fine in prose, but the code says egg)

**Stage**:
A step of an egg round, 0–5: ready, heating, boiling (pull it out), ice bath, cracking, result. Stages 1–4 are a round in progress; 0 and 5 are at rest.

**Pot**:
The ASCII pot the egg cooks in. Clicking it only pans the view.

**Rules card**:
The first-round briefing shown before the stove starts.
_Avoid_: tutorial, instructions
