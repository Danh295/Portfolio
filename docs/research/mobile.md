# Mobile UI research (2026-10-10)

Sources behind the mobile polish decisions. **[inference]** marks reasoning that isn't from a source. Forum and bug-thread reports are noted as such.

## Tap targets

- WCAG 2.2 SC 2.5.8 (AA): targets are at least 24×24 CSS px, or undersized targets are spaced so a 24px circle centred on each doesn't intersect another target. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- SC 2.5.5 (AAA): 44×44 CSS px. Apple HIG lists 44×44 pt as the iOS default. https://developer.apple.com/design/human-interface-guidelines/accessibility Material and Android: 48×48 dp with 8dp or more between targets. https://support.google.com/accessibility/android/answer/7101858
- SC 2.4.11 Focus Not Obscured (AA): a sticky bar must not fully hide a focused element (failure F110). Technique C43: `scroll-padding` on `html` equal to the bar height. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html, https://www.w3.org/WAI/WCAG22/Techniques/css/C43
- SC 1.4.10 Reflow: no two-dimensional scrolling at 320px, except content that needs a 2-D layout (ASCII art, code). https://www.w3.org/WAI/WCAG22/Understanding/reflow.html

## Touch detection and hints

- `hover` and `pointer` media queries test the primary input only. `any-hover`/`any-pointer` test all. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer
- **[inference]** `(hover: none) and (pointer: coarse)` still matches an iPad with a keyboard attached, and no media query detects a keyboard.
- WCAG 2.1.4: single-key shortcuts must be switchable off, remappable, or active only on focus. https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts

## iOS specifics

- iOS Safari zooms into a focused field whose font size is under 16px. Fix: `font-size: max(16px, 1em)`. Never `maximum-scale`/`user-scalable=no` (fails WCAG 1.4.4). https://css-tricks.com/?p=339455 (no official WebKit page states the threshold)
- `-webkit-text-size-adjust: 100%` stops iOS landscape text inflation. https://makandracards.com/makandra/44946-ios-safari-scales-text-in-landscape-mode
- `env(safe-area-inset-bottom)` needs `viewport-fit=cover`; use `max(<padding>, env(...))`. https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- `touch-action: manipulation` disables double-tap zoom and keeps pan and pinch. https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- iOS 26 Safari's Compact bottom bar and Android Chrome's bottom address bar (since June 2025) have reported clipping and tinting problems with fixed bottom elements. Forum reports only: https://developer.apple.com/forums/thread/800798, https://developer.apple.com/forums/thread/799143, https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/

## Navigation

- Hidden (hamburger) navigation on phones was used 57% of the time versus 86% for visible-or-mixed navigation, with tasks 15% slower. With 4 or fewer links show them all; with more, hide some and add in-page links. https://www.nngroup.com/articles/hamburger-menus/
- Priority+: top links visible, the rest behind a labelled "more". https://bradfrost.com/blog/post/revisiting-the-priority-pattern/ (named by Michael Scharnagl: https://css-tricks.com/the-priority-navigation-pattern/)
- Horizontally scrolling tabs hide items ("out of sight is out of mind"). https://www.nngroup.com/articles/mobile-navigation-patterns/
- Icon-only buttons need a text label. https://www.nngroup.com/articles/icon-usability/

## Bars and chrome budget

- NN/g: keep sticky headers small; about 13:1 content-to-chrome is reasonable (≈7%), about 2:1 is excessive. https://www.nngroup.com/articles/sticky-headers/
- Material 3 navigation bar: three to five in-app destinations. https://developer.android.com/develop/ui/compose/components/navigation-bar Apple: a tab bar is for navigation, not actions. https://developer.apple.com/design/human-interface-guidelines/tab-bars
- No NN/g or Material source endorses a pinned bar of external links; NN/g says users look for contact links in the footer. https://www.nngroup.com/articles/footers/ **[inference]** The owner chose a slim pinned bar anyway; the cost is the iOS 26 clash above, to be checked on a real phone.
- Hoober retracted his 2013 thumb-zone drawings. https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php

## The first screen

- 57% of viewing time is above the fold, 74% in the first two screens. https://www.nngroup.com/articles/scrolling-and-attention/
- False floors: let the next section peek into view. https://www.nngroup.com/articles/illusion-of-completeness/
- Be brief on mobile and lead with the main point; defer the rest. https://www.nngroup.com/articles/mobile-content/, https://www.nngroup.com/articles/progressive-disclosure/

## Terminal-style pages on phones

- Termpage offers tappable command suggestions under the prompt. https://awesome.ecosyste.ms/projects/github.com%2Ftautvilas%2Ftermpage
- xterm.js has weak touch support (issue #5377). https://lightrun.com/answers/xtermjs-xterm-js-support-mobile-platforms
- Monospace characters are about 0.6em wide, so 16px type gives about 34 characters on a 360px screen. **[inference]**
