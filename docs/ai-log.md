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

## 2026-11-10 · Components, device frame, gallery

**Generated**
- All CLAUDE.md components (steps 3–6), one folder each with a CSS module, using component/semantic tokens only. Read from `/reference` component sheets (base sheet is at 3×, composite at 2×).
- `DeviceFrame`: Android mockup on desktop/tablet (bezel, status bar, gesture bar), removed on phones so the app fills the screen. On short laptop windows the app area shrinks in height and scrolls; width stays 412.
- Component gallery at `#components`, with all four PlanCard states stacked and sheets openable by URL (`&sheet=review`).
- Git repo + private GitHub remote.

**Decisions (agreed with Ariana)**
- Sparkle = AI only. Status tags get status icons: check (Fits your budget, Approved, On track), sliders (Plan adjusted), triangle (Doesn't fit, warnings). Figma draws sparkles on these.
- "Uses your whole June allowance" warning has no action. Figma shows "Go now", the Tag component's placeholder.
- Real AI later: conversation goes behind an `AssistantEngine` interface (scripted default, Claude via a serverless proxy as an option), with example utterances as shared tests.

**Copy changes (sync to Figma)**
- Plan status "No budget" → "Doesn't fit" (matches the state name and the script).
- ~~"≈ +8 € that you have free each month" → "≈ 8 € more than you have free each month"~~ Reverted on 2026-11-11: Ariana confirmed the Figma copy is correct. Kept as "≈ +8 € that you have free each month".
- Home chip "Tranfer money" → "Transfer money".

**Small interpretations**
- Disabled primary button keeps white text on Brand/200, as in Figma (the token table says `ButtonFgDisabled`). Disabled secondary and ghost use `ButtonFgDisabled`.
- Filled TextField (Figma column 3) keeps the focus border after blur.
- Chat composer always shows the send button, disabled until there's text (as in Figma C1). The compact Home composer swaps mic → send when typing.
- AffordabilityBar legend rounds to the nearest 10 € (859,47 → 860 €), as in Figma. Exact figures go in the "Why these numbers?" sheet.
- New component tokens not in CLAUDE.md: `SuggestionBorder` → Purple/200, `ValueEditUnderline` → BorderFocus, `DeviceBezel` → Neutral/900, `DeviceStatusFg` → TextPrimary.
- Value grids never shrink a column below its content; under 320 px of card width, values drop from ValueLg to ValueMd so two dates fit side by side on 360 px phones.
- Headless Chrome won't render narrower than ~500 px, so phone screenshots were checked at 540 px.

## 2026-11-13 · Deploy target

- Deploy moved from Vercel to Cloudflare (Ariana already hosts other projects there). Git integration with the GitHub repo.
- 2026-11-23: Cloudflare's dashboard now creates apps as Workers with static assets (Pages is labelled legacy), so the deploy uses `wrangler.jsonc` + `npx wrangler deploy`, serving `./dist`. The future real-AI proxy becomes a Worker script handling `/api/assistant`, with the key as a Cloudflare secret. Dry run checked locally.
- Added `.node-version` (22) so Cloudflare's build uses a Node version that Vite 8 supports.

## 2026-11-23 · Conversation, screens

**Generated**
- `lib/assistant.ts`: the `AssistantEngine` interface and a scripted engine. Typed text becomes an intent (start trip, set goal / date / monthly, apply suggestion, reach sooner, why, review). Parses pt-PT amounts ("4.000", "3.000,50", "4k") and months ("in October", "by December", "Sep 2027"); a month without a year resolves to the current target's year.
- `lib/examples.ts`: 31 example utterances → expected intents, run as tests against the scripted engine (and later against a Claude-backed one).
- `lib/conversation.ts`: pure state machine. Editing a field, typing and voice go through the same functions, so they give the same result (tested). The AI's replies are built from `plan.ts` numbers; the script copy from CLAUDE.md is reproduced word for word and tested.
- Screens: Home, Assistant (full happy path, Why and Review sheets, sticky PlanHeader), Goal, and a placeholder for Payments and Cards.
- `moveDateOption` in `plan.ts` for the "Move the date" alternative, with a test.

**Interpretations to check**
- "Move the date" keeps 40 € free each month (220 → 180 €/month), the only rule that gives the spec's 180 €/month → 25 Dec 2027. Constant `STRETCH_BUFFER`.
- The living plan card moves below the newest AI message whenever it changes (C2 and C4 show the card under the latest reply). It's the same card, never a copy.
- After a change, the thread scrolls to the change-log line ("Updated: goal 4.000 €"), as in C2.
- Changing the goal, target or start recalculates the AI's default proposal (resets applied suggestions). Changing an allowance share or the monthly amount keeps the AI proposal, so "See AI proposal" can reset it.
- A fixed monthly amount from chat moves the target date to the month it's reached ("120 a month" → Dec 2027).
- "Not now" and "Reminder set" add a change-log line with Undo. Only the latest change can be undone.
- Netflix "Apply" sets a reminder only; the plan doesn't change (the AI can't cancel subscriptions).
- Tight plans that are the AI's own proposal show "Plan adjusted" with the note but without "See AI proposal".
- "Reach it sooner" suggestions appear inside the plan card's Proposal section ("Ways to reach it sooner"), replacing the button.

**Deviations from Figma / spec (to sync or confirm)**
- Assistant TopBar has a back arrow instead of the sparkle: the conversation is full screen with no bottom nav, so there was no way back.
- Budget chips are "3.000 €, Help me estimate, Other amount" (CLAUDE.md script). Figma B1 shows "Input amount, Help me estimate".
- "Other amount" opens the goal field in the request card. "Help me estimate" isn't supported yet: the AI says so and offers the chips again.
- Home: "Good morning, Inês" sits next to the avatar in the hero (in the script, not in Figma A).
- Home transactions: "Business name" placeholders → Groceries −42,30 € and Eating out −18,50 € on 3 Nov 2026.
- Goal screen: placeholder basket icons → Repeat (monthly transfer), Gift (Christmas), Sun (holiday); the dashed trailing squares are left out.
- Invite partner, Add money and Round up payments show "This isn't part of the prototype yet."
- Payments and Cards tabs open a placeholder screen pointing to the assistant.

**Copy changes (sync to Figma)**
- Why sheet title "Review 4 actions" → "Why these numbers?" (Figma D reuses the review sheet's title).

**New tokens**: `HeroGlow` → Brand/600, `HeroGlowSoft` → Brand/200 (Home hero gradient).
