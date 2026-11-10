# CLAUDE.md — AI-native banking prototype

Coded prototype of a design case study: a mobile banking app where the user states a goal in natural language and an AI assistant turns it into a clear, adjustable, approvable savings plan. Built for portfolio. The Figma file is the design source of truth; this file is the behaviour source of truth.

## Working agreement

- Mirror Figma: component names and props match the Figma components (PascalCase components, camelCase props).
- Never hard-code colours, spacing, radii or type. Everything comes from tokens (see Design system).
- Ask before adding a dependency that isn't listed under Stack.
- The AI runs behind one `AssistantEngine` interface (`interpret(text, context) → Intent`). The default engine is scripted (state machine + simple intent matching) and makes no LLM calls. A Claude-backed engine can be added later as a toggle, called through a serverless function (`/api/assistant`) so no API key ships to the browser. Screens never know which engine is running.
- `src/lib/examples.ts` holds example utterances → expected intents. They are the test cases for every engine (scripted now, real AI later).
- Copy: tidy awkward or placeholder Figma copy when implementing, and log each change in `docs/ai-log.md` so Figma can be synced.
- All plan numbers come from the functions in `src/lib/plan.ts`, never typed into components. The test cases below must pass.
- Keep a short log of notable decisions and corrections in `docs/ai-log.md` (what you generated, what was changed). It feeds the case study.
- The Figma MCP has very few calls left on this account. Do not call it unless asked. Use `/reference` PNGs and `/tokens` JSON instead.

## Stack

- React + Vite + TypeScript
- Plain CSS with CSS custom properties (one `tokens.css` generated from `/tokens`), CSS modules per component
- `lucide-react` for icons
- `framer-motion` for card/sheet transitions (optional, ask first)
- Vitest for `plan.ts` tests
- Deploy: Vercel or GitHub Pages

## Commands

- `npm run dev` — regenerates tokens, starts Vite
- `npm test` — Vitest (plan + format)
- `npm run tokens` — regenerate `src/styles/tokens.css` from `tokens/variables.json`
- `npm run build` — type-check and build

## Repo structure

```
/reference          PNG exports of Figma screens A–F (visual reference)
/tokens             Variables exported from Figma as JSON (source for tokens.css)
/scripts            build-tokens.mjs (JSON → tokens.css; semantic/component aliases live here)
/docs/ai-log.md     Decisions and corrections log
src/
  styles/tokens.css     generated: primitives → semantics → component tokens
  styles/global.css     reset, body type, focus ring
  lib/plan.ts           plan calculations (pure functions, tested)
  lib/format.ts         currency and date formatting (pt-PT numbers, English UI)
  lib/conversation.ts   scripted state machine + intent matching
  components/           one folder per component
  screens/              Home, Assistant (conversation), Goal
  components/DeviceFrame   Android mockup on desktop/tablet; hidden on phones (app fills the screen)
  screens/ComponentGallery every component and state, at #components
  App.tsx               view switcher (Prototype / Components) + DeviceFrame
```

## Presentation

- Phone (width < 600 px, or a short touch screen): the app fills the real screen, no mockup chrome.
- Desktop and tablet: a static Android mockup (dark bezel, status bar, gesture bar) with the 412 × 917 app area. On short windows the app area shrinks in height and scrolls inside; the width stays 412.
- `#components` opens the component gallery inside the mockup. `#components&sheet=info|review|validating|success` opens a sheet state directly (for review and screenshots).

## Product context

- UI language: English. Context: Portugal (euro, pt-PT number format, holiday and Christmas allowances).
- Platform: Android (412 px wide frames, Material-style bottom nav, fingerprint authentication).
- Persona: Inês, 32, Porto. Net salary 1.500 € paid on the 25th, 14 times a year (holiday allowance ~1.500 € in June, Christmas allowance ~1.500 € in November). Travels abroad once a year when budget allows; values entertainment and eating out.
- Monthly budget (6-month average): fixed costs 859,47 € (rent 650, utilities and internet 90, transport 40, gym 35, phone 15, subscriptions 29,47: Spotify Family 15,49, Netflix Basic 8,99, Prime Video 4,99). Flexible 420 € (groceries 220, eating out 110 up from 80 four months ago, shopping 60, other 30). Free margin ≈ 220 €.
- Last November about 500 € of the Christmas allowance stayed unspent.
- Today in the prototype: 4 Nov 2026. Current balance: 1.240,18 €.

## Design system

Three token tiers. Components only use component tokens or semantic tokens, never primitives directly.

Naming: Figma uses PascalCase (`TextPrimary`, `Brand/600`). In CSS use kebab-case custom properties: `--text-primary`, `--brand-600`. Text styles are `font` shorthands: `font: var(--font-body)`. `/tokens/variables.json` wins over the values below.

### Primitives

| Family | Values |
| --- | --- |
| Neutral | 0 #FAFBFE · 50 #F1F2F9 · 100 #E9EBF6 · 200 #D4D7ED · 300 #B8BCD6 · 400 #9296B4 · 500 #6E7394 · 600 #555A78 · 700 #3D4160 · 800 #272A40 · 900 #141722 |
| Brand | 100 #DCDCF8 · 200 #C4C4F2 · 400 #8080E5 · 600 #3333D6 · 700 #2626A8 |
| Purple (AI) | 100 #ECC9FE · 200 #DDA6FD · 400 #C861FC · 700 #7A2DB0 |
| Cyan (info) | 100 #D3F3F5 · 200 #87DEE4 · 300 #5FCDD5 · 500 #1B8990 · 700 #136970 |
| Green (success) | 100 #D6F0E8 · 300 #7FD1B9 · 700 #3D6E6E |
| Yellow (warning) | 100 #F3EDBF · 300 #E8DB7D · 700 #7A6A12 |
| Red (danger) | 100 #F6DCE5 · 300 #DA6894 · 600 #A42858 |

### Semantics

| Token | → | Token | → |
| --- | --- | --- | --- |
| TextPrimary | Neutral/900 | Bg | Neutral/50 |
| TextSecondary | Neutral/600 | Surface | Neutral/100 |
| TextPlaceholder | Neutral/500 | SurfaceRaised | Neutral/0 |
| TextInverse | Neutral/0 | BorderSubtle | Neutral/200 |
| TextBrand | Brand/600 | BorderStrong | Neutral/300 |
| Accent | Brand/600 | BorderFocus | Brand/600 |
| AiSurface / AiIcon / AiText | Purple 100 / 400 / 700 | InfoBg / InfoFg | Cyan 100 / 700 |
| SuccessBg / SuccessFg | Green 100 / 700 | WarningBg / WarningFg | Yellow 100 / 700 |
| DangerBg / DangerFg | Red 100 / 600 | | |

Rules: purple and the sparkle icon mean "AI" only. Status tags use status icons instead (check for fits / on track / approved, sliders for adjusted, triangle for warnings and doesn't fit), even where Figma draws a sparkle. Cyan means info and app actions. Status text (`*Fg`) is never placed on `Surface` (yellow fails contrast there); on `Surface` use a Tag with its own background.

### Component tokens (aliases)

Buttons: `ButtonPrimaryBg`→Accent, `…BgPressed`→Brand/700, `…BgDisabled`→Brand/200, `ButtonPrimaryFg`→TextInverse, `ButtonSecondaryBg`→Brand/100, `…BgPressed`→Brand/200, `…BgDisabled`→Surface, `ButtonSecondaryFg`→TextBrand, `…FgPressed`→Brand/700, `ButtonGhostBgPressed`→Brand/100, `ButtonGhostFg`→TextBrand, `…FgPressed`→Brand/700, `ButtonFgDisabled`→Neutral/400.
Fields: `FieldBg`→Surface, `FieldBgFocus`→SurfaceRaised, `FieldBgDisabled`→Bg, `FieldBorder`→BorderStrong, `FieldBorderFocus`→BorderFocus, `FieldText`→TextPrimary, `FieldPlaceholder`→TextPlaceholder, `FieldFgDisabled`→ButtonFgDisabled.
Chips and tags: `ChipActionBg`→Cyan/200, `ChipActionBgPressed`→Cyan/300, `ChipAiBg`→AiSurface, `ChipAiBgPressed`→Purple/200, `ChipFg`→TextPrimary, `ChipBgDisabled`→Surface, `ChipFgDisabled`→ButtonFgDisabled, `TagNeutralBg`→Surface, `TagNeutralFg`→TextSecondary.
Other: `CardBg`→SurfaceRaised, `CardBorder`→BorderSubtle, `ListRowBgPressed`→Surface, `ToggleTrackOn`→Accent, `ToggleTrackOff`→Neutral/500, `ToggleThumb`→SurfaceRaised, `SegmentTrack`→Surface, `SegmentSelectedBg`→SurfaceRaised, `SegmentFg`→TextSecondary, `SegmentFgSelected`→TextPrimary, `ProgressTrack`→BorderSubtle, `ProgressFill`→Accent, `LinkFg`→TextBrand, `LinkFgPressed`→Brand/700, `AmountPositive`→SuccessFg, `AmountNegative`→TextPrimary, `HeroBg`→Brand/400, `ChatUserBg`→Brand/100, `ChartFixed`→Neutral/400, `ChartFlexible`→Neutral/300, `ChartFree`→Accent, `SheetHandle`→BorderStrong, `NavBg`→SurfaceRaised, `NavIndicator`→Brand/100, `NavFg`→TextSecondary, `NavFgActive`→TextPrimary, `Scrim`→Neutral/900 at 40% opacity.

### Dimensions, type, effects

- Spacing: 4, 8, 12, 16, 20, 24, 32, 40. Radius: Sm 8, Md 12, Lg 20, Full 999. TouchTarget 44. Icons 16, 20, 24, 32.
- Fonts: Plus Jakarta Sans for everything except standalone numbers, which use Geist Mono. Numbers inside sentences stay in Jakarta.
- Text styles (from `/tokens`):

| Style | Font | Size/line | Weight |
| --- | --- | --- | --- |
| ValueXl | Geist Mono | 40/48 | Medium |
| ValueLg | Geist Mono | 24/32 | Medium |
| ValueMd | Geist Mono | 16/24 | Regular |
| Title | Plus Jakarta Sans | 28/36 | SemiBold |
| Heading | Plus Jakarta Sans | 20/28 | SemiBold |
| CardHeading | Plus Jakarta Sans | 16/20 | SemiBold |
| CardSubheading | Plus Jakarta Sans | 14/20 | SemiBold |
| Body | Plus Jakarta Sans | 16/24 | Regular |
| BodyStrong | Plus Jakarta Sans | 16/24 | SemiBold |
| Label | Plus Jakarta Sans | 16/20 | Regular |
| Caption | Plus Jakarta Sans | 12/16 | Regular |
| CaptionStrong | Plus Jakarta Sans | 12/16 | SemiBold |

- Shadows: `Shadow` (default, cards) 0 4px 11.6px rgba(212,215,237,.8); `Shadow/Button` 0 4px 12px rgba(51,51,214,.25); `Shadow/Sheet` 0 -4px 24px rgba(20,23,34,.12).

## Components (Figma → React)

| Component | Props |
| --- | --- |
| Button | `level: 'primary'|'secondary'|'ghost'`, `disabled`, `children` (pressed = :active) |
| IconButton | `icon`, `label` (aria), `disabled` |
| ActionChip | `tone: 'action'|'ai'`, `icon?`, `children`, `disabled` (min-height 44) |
| Tag | `tone: 'neutral'|'info'|'ai'|'success'|'warning'|'danger'`, `icon?`, `children` |
| TextField | `type: 'text'|'number'|'date'`, `label?`, `placeholder?`, `value`, `disabled` |
| Toggle | `checked`, `label?`, `onChange` |
| SegmentedControl | `options`, `value`, `onChange` |
| ListRow | `type: 'default'|'transaction'`, `context: 'card'|'standalone'`, `title`, `subtitle?`, `amount?`, `leading?`, `trailing?` |
| ProgressBar | `value` (0–100) |
| Link | `children`, `onClick` |
| Card | `title?`, `action?`, `children` |
| ValueField | `state: 'readOnly'|'editable'|'editing'`, `label`, `value`, `onEdit?` (editing shows a 2 px `BorderFocus` underline) |
| AffordabilityBar | `income`, `fixed`, `flexible` (free = remainder; segments proportional; legend below) |
| ActionRow | `title`, `detail`, `enabled`, `onToggle` |
| SuggestionRow | `recommended`, `text`, `impact`, `question`, `onApply`, `onDismiss` (outlined card; "Recommended" AI tag) |
| AlternativeRow | `title`, `detail`, `actionLabel`, `onAction` |
| ReviewActionRow | `number`, `title`, `detail`, `enabled`, `onToggle` |
| RequestSummary | `trip`, `goal?`, `targetDate` (editable ValueFields) |
| PlanCard | `state: 'default'|'doesntFit'|'adjusted'|'approved'` + plan data |
| PlanHeader | `title`, `summary`, `status` (compact sticky version of PlanCard) |
| ChatMessage | `type: 'user'|'ai'|'working'|'changeLog'`, `children`, `onUndo?` |
| Composer | text input + mic, send appears when typing; always visible |
| BottomSheet | `type: 'info'|'action'`, `state: 'default'|'review'|'validating'|'success'`, `title`, `children`, `footer` |
| BottomNav | `active: 'home'|'payments'|'assistant'|'goals'|'cards'` |
| TopBar | `title`, `onBack?` |

## Plan logic (`src/lib/plan.ts`)

Inputs: goal amount, target month, start date (default next payday), free margin, allowance shares (holiday in June, Christmas in November), optional fixed monthly amount from chat.

- Transfers happen on paydays (25th) from the start date up to and including the target month. Nov 2026 → Sep 2027 = 11 transfers.
- Comfortable monthly cap = free margin − 70 € buffer (220 → 150).
- Default proposal: monthly = comfortable cap; holiday allowance share = goal − monthly × transfers (if it fits within the allowance).
- Monthly needed = ceil((goal − allowance shares) / transfers).
- Buffer = free margin − monthly. Status: buffer ≥ 70 → fits; 0 ≤ buffer < 70 → tight (shown as adjusted with a note); buffer < 0 → doesn't fit.
- Projection: cumulative savings per payday, adding each allowance share in its month. Reach date = first payday where cumulative ≥ goal.
- Frequency is display only: week ≈ monthly × 12 / 52, day ≈ monthly × 12 / 365, rounded to whole euros.
- Round-ups never add money: they come out of the same free margin.
- Allowance shares are one-off: each is added once, in its first month inside the saving window. A projection that runs past the target doesn't pick up next year's allowance.
- "Reach it sooner" suggestions keep the current monthly and holiday share and add on top (e.g. Christmas 500 € → reach Jun 2027). Pass `monthly` + `holidayShare` explicitly for these.

### Test cases (must pass)

| Scenario | Expected |
| --- | --- |
| 3.000 €, Sep 2027, defaults | 150 €/month (≈ 35 €/week, ≈ 5 €/day), holiday share 1.350 €, reach 25 Sep 2027, buffer 70 €, fits |
| 4.000 €, Sep 2027, full holiday 1.500 € | needs 228 €/month, buffer −8 €, doesn't fit |
| 4.000 € + Christmas 500 € + holiday 1.500 € | 182 €/month, buffer 38 €, reach 25 Sep 2027, tight (uses whole June allowance) |
| 4.000 €, 180 €/month, holiday 1.500 €, no Christmas | 14 transfers, reach 25 Dec 2027 |
| 3.000 € + Christmas 500 € | reach 25 Jun 2027 |
| 3.000 €, eating out back to 80 € (margin 250, 180 €/month) | reach 25 Aug 2027 |
| 3.000 €, cancel Netflix (+8,99 €) | ≈ 99 € more by September |
| 3.000 €, no allowances, 220 €/month | reach 25 Dec 2027 |
| 3.000 €, no allowances, by Sep 2027 | doesn't fit (220 × 11 = 2.420 €) |

### Formatting (`src/lib/format.ts`)

- Currency: `1.240,18 €` (dot thousands, comma decimals, € after with a space), `−42,30 €` with a real minus sign. Note: `Intl.NumberFormat('pt-PT')` drops grouping for 4-digit numbers by default; force it (`useGrouping: 'always'`) or format manually.
- Dates: `25 Sep 2027`, months as `Sep 2027`.

## Interaction rules

- One living plan card. It updates in place; it never spawns a new version. Each change adds a ChangeLog line in the chat with Undo. Once edited, "Adjusted · See AI proposal" allows a one-level reset.
- Inputs are editable (goal, target date, start date, allowance shares). Outputs are read-only (monthly amount, reach date, buffer). The user can change the frequency display. A fixed monthly amount is requested in chat ("I can only do 120 a month"), and the AI recalculates the date.
- Editing works three ways with the same result: tap the ValueField edit icon, type in the composer, or use voice (simulated).
- AI suggestions appear only when the goal doesn't fit, or when the user taps "Reach it sooner". The AI asks rather than claims ("Still using both?") and offers facts and impact, never judgement.
- "Not now" removes that suggestion with an Undo line in chat. If it was Recommended, the tag moves to the next suggestion. If all are dismissed, only the alternatives remain.
- The two alternatives (move the date, go back to 3.000 €) are separate actions and replace the plan; they don't combine.
- Review and approve happens in a modal action sheet, action by action, then fingerprint (simulated). Success shows in the sheet and as "Approved ✓" on the card. No automatic redirect: "View goal" is a link.
- Nothing moves from an allowance automatically: each allowance is an alert the user confirms when it arrives.
- The AI cannot cancel subscriptions; it offers a reminder.
- Composer and TopBar stay fixed; the conversation scrolls. When the plan card scrolls out of view, PlanHeader sticks below the TopBar.
- Conversation is full screen (no bottom nav). Home and Goal show the bottom nav.

## Script (happy path)

1. Home: "Good morning, Inês" · balance 1.240,18 € · composer "What would you like to do?" · contextual suggestion "Most months you have about 220 € left over. Want to put it towards something?" · chips: Save for a trip, Send money, Block card.
2. User: "I'm planning a trip to Japan for two in September 2027 and want to start saving for it." AI: "Great plan. Here's what I understood:" + RequestSummary (Japan · 2 people · Goal ? · Sep 2027). AI: "Do you already have a budget in mind?" chips: 3.000 € · Help me estimate · Other amount.
3. User taps 3.000 €. AI: "To see what you can comfortably save, I'll look at your current account: the last 6 months of spending and the last 12 months for allowances." Working: "Checking your income and fixed costs…", "Looking for your holiday allowance…".
4. AI: "Good news: 3.000 € by September fits your budget. Here's a plan." PlanCard default.
5. User changes the goal to 4.000 € (edit icon or "Make it 4.000 €"). AI: "4.000 € by September doesn't quite fit: you'd need 228 €/month even with your whole allowance, about 8 € more than you have free. Here are some ways to get there." Suggestions: Christmas allowance (Recommended; "Move 500 € to Japan when your Christmas allowance arrives?"), eating out ("Set an 80 €/month eating-out budget with alerts?"), Netflix ("Remind you before Netflix renews?"). Alternatives: move the date (180 €/month, 25 Dec 2027), go back to 3.000 €.
6. User applies the Christmas allowance. AI: "Updated: 182 €/month, 500 € from your Christmas allowance in November and 1.500 € from your holiday allowance in June get you to 4.000 € by 25 Sep 2027, with about 38 € left each month. I'll ask you to confirm each allowance when it arrives. Heads-up: this uses your whole June allowance."
7. Review sheet "Review 4 actions": create goal "Japan 2027" (4.000 € by 25 Sep 2027) · monthly transfer 182 € every 25th from 25 Nov 2026, 11 transfers, pause or cancel anytime · Nov 2026: move 500 € from your Christmas allowance, I'll ask you to confirm first · Jun 2027: move 1.500 € from your holiday allowance, I'll ask you to confirm first. Note: "Nothing moves from either allowance without your confirmation." Button "Approve 4 actions" → "Validating…" → "Done. Japan 2027 is set up. First transfer on 25 Nov."
8. Chat: "Since this trip is for two, want to invite your partner to save together?" Goal screen: 0 € of 4.000 €, on track for 25 Sep 2027, active automations, actions (Add money, Round up payments, Share goal with…, Edit plan, View conversation).

Intent matching for the demo: amounts ("make it 4.000", "4000 €"), dates ("in October", "by December"), fixed monthly ("only 120 a month"), "reach it sooner", "why". Anything else: the AI says it can't help with that yet and offers the chips.

## Accessibility

- Contrast pairs above meet WCAG AA; don't introduce new text/background pairs without checking.
- Touch targets ≥ 44 px. Visible focus using `BorderFocus`.
- Recalculated values are announced with `aria-live="polite"`.
- Amounts and dates have readable labels for screen readers ("150 euros per month").

## Build order

1. `tokens.css` from `/tokens` (or the tables above) and `format.ts`. ✅
2. `plan.ts` with the test cases passing. ✅
3. Base components: Button, IconButton, ActionChip, Tag, TextField, Toggle, SegmentedControl, Link, ListRow, ProgressBar, Card. ✅
4. ValueField, AffordabilityBar, the row components, RequestSummary. ✅
5. PlanCard (all states) and PlanHeader. ✅
6. ChatMessage, Composer, TopBar, BottomNav, BottomSheet. ✅ (+ DeviceFrame, component gallery)
7. Conversation state machine and screens, then the Home and Goal screens.
8. Transitions, sticky header, polish, deploy.
