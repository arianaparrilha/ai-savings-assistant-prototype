# AI log

Notable decisions and corrections while building the prototype with Claude Code. Feeds the case study.

## 2026-11-09 · Setup, tokens, plan logic

**Generated**
- Vite + React + TypeScript scaffold, Vitest, lucide-react. Phone frame (412 px) centred on desktop, full-bleed under 460 px.
- `scripts/build-tokens.mjs`: turns the Figma export (`tokens/variables.json`) into `src/styles/tokens.css`. Primitives, shadows and text styles come from the JSON; semantic and component aliases aren't in the export, so they're defined in the script from CLAUDE.md. Text styles become `font` shorthands (`font: var(--font-body)`), prefixed `--font-` so they don't clash with colour tokens like `--text-primary`.
- `src/lib/format.ts`: manual pt-PT formatting (avoids `Intl` dropping grouping on 4-digit numbers), real minus sign, non-breaking space before €, screen-reader labels.
- `src/lib/plan.ts` + tests: all 9 CLAUDE.md scenarios pass on the first run.

**Spec vs. Figma export (export wins; CLAUDE.md updated)**
- Neutral/100 is `#E9EBF6` in Figma, not `#E2E4F3`. It's `Surface`, so it affects fields, tags, segment tracks.
- New text styles: Heading 20/28 SemiBold, CardHeading 16/20 SemiBold, CardSubheading 14/20 SemiBold, CaptionStrong 12/16 SemiBold.
- New default `Shadow` (0 4 11.6, Neutral/200 at 80%), used for cards and the phone frame.

**Interpretations to check**
- "3.000 € + Christmas 500 € → Jun 2027" and "eating out back to 80 € → Aug 2027" only work if the existing plan (holiday share 1.350 €) is kept and the change is added on top. Recalculating the default proposal would shrink the holiday share and keep the date at Sep. Modelled as "reach it sooner" = keep monthly + holiday share, add the extra.
- Allowance shares are one-off: a plan that runs past the target (e.g. 180 €/month → Dec 2027) doesn't collect June 2028's allowance.
- Default proposal when the goal needs more than the whole holiday allowance: share caps at 1.500 € and monthly rises to the amount needed (4.000 € → 228 €/month), which matches step 5 of the script.
