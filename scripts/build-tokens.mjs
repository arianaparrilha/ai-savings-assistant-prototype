// Generates src/styles/tokens.css from tokens/variables.json (Figma export).
// Primitives, shadows and text styles come from the JSON. Semantic and component
// aliases, spacing and radii aren't in the export yet, so they live here (from CLAUDE.md).
// Run: npm run tokens (also runs before dev and build).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const json = JSON.parse(readFileSync(new URL('tokens/variables.json', root), 'utf8'));

const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s/_]+/g, '-')
    .toLowerCase();

const hexToRgba = (hex, alphaOverride) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = alphaOverride ?? (h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  return `rgb(${r} ${g} ${b} / ${+a.toFixed(3)})`;
};

const resolve = (ref) => {
  const m = /^\{(.+)\}$/.exec(ref);
  if (!m) return ref;
  return m[1].split('.').reduce((node, key) => node?.[key], json)?.$value;
};

const WEIGHTS = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };
const FALLBACK = { 'Geist Mono': 'ui-monospace, monospace', 'Plus Jakarta Sans': 'system-ui, sans-serif' };

// ── Primitives ────────────────────────────────────────────────────────────────
const colorFamilies = Object.entries(json).filter(([, v]) =>
  Object.values(v).some((t) => t?.$type === 'color'),
);
const primitives = colorFamilies.flatMap(([family, steps]) =>
  Object.entries(steps).map(([step, t]) => `  --${kebab(family)}-${step}: ${t.$value};`),
);

// ── Shadows ───────────────────────────────────────────────────────────────────
const shadowCss = ({ x, y, blur, spread, color }) =>
  `${x}px ${y}px ${+blur.toFixed(1)}px ${spread}px ${hexToRgba(color)}`;
const shadows = [`  --shadow: ${shadowCss(json.Shadow.$value)};`];
for (const [name, t] of Object.entries(json.Shadow)) {
  if (t?.$type === 'boxShadow') shadows.push(`  --shadow-${kebab(name)}: ${shadowCss(t.$value)};`);
}

// ── Text styles (font shorthand: `font: var(--font-body)`) ────────────────────
const fontFamilies = Object.values(json.fontFamilies).map(
  (f) => `  --font-family-${kebab(f.$value)}: '${f.$value}', ${FALLBACK[f.$value] ?? 'sans-serif'};`,
);
const textStyles = Object.entries(json)
  .filter(([, v]) => v?.$type === 'typography')
  .map(([name, { $value: v }]) => {
    const family = resolve(v.fontFamily);
    const weight = WEIGHTS[resolve(v.fontWeight)] ?? 400;
    const size = resolve(v.fontSize);
    const line = resolve(v.lineHeight);
    return `  --font-${kebab(name)}: ${weight} ${size}px/${line}px var(--font-family-${kebab(family)});`;
  });

// ── Semantics (alias → primitive) ─────────────────────────────────────────────
const semantics = {
  TextPrimary: 'neutral-900',
  TextSecondary: 'neutral-600',
  TextPlaceholder: 'neutral-500',
  TextInverse: 'neutral-0',
  TextBrand: 'brand-600',
  Accent: 'brand-600',
  Bg: 'neutral-50',
  Surface: 'neutral-100',
  SurfaceRaised: 'neutral-0',
  BorderSubtle: 'neutral-200',
  BorderStrong: 'neutral-300',
  BorderFocus: 'brand-600',
  AiSurface: 'purple-100',
  AiIcon: 'purple-400',
  AiText: 'purple-700',
  InfoBg: 'cyan-100',
  InfoFg: 'cyan-700',
  SuccessBg: 'green-100',
  SuccessFg: 'green-700',
  WarningBg: 'yellow-100',
  WarningFg: 'yellow-700',
  DangerBg: 'red-100',
  DangerFg: 'red-600',
};

// ── Component tokens (alias → semantic or primitive) ──────────────────────────
const components = {
  ButtonPrimaryBg: 'accent',
  ButtonPrimaryBgPressed: 'brand-700',
  ButtonPrimaryBgDisabled: 'brand-200',
  ButtonPrimaryFg: 'text-inverse',
  ButtonSecondaryBg: 'brand-100',
  ButtonSecondaryBgPressed: 'brand-200',
  ButtonSecondaryBgDisabled: 'surface',
  ButtonSecondaryFg: 'text-brand',
  ButtonSecondaryFgPressed: 'brand-700',
  ButtonGhostBgPressed: 'brand-100',
  ButtonGhostFg: 'text-brand',
  ButtonGhostFgPressed: 'brand-700',
  ButtonFgDisabled: 'neutral-400',
  FieldBg: 'surface',
  FieldBgFocus: 'surface-raised',
  FieldBgDisabled: 'bg',
  FieldBorder: 'border-strong',
  FieldBorderFocus: 'border-focus',
  FieldText: 'text-primary',
  FieldPlaceholder: 'text-placeholder',
  FieldFgDisabled: 'button-fg-disabled',
  ChipActionBg: 'cyan-200',
  ChipActionBgPressed: 'cyan-300',
  ChipAiBg: 'ai-surface',
  ChipAiBgPressed: 'purple-200',
  ChipFg: 'text-primary',
  ChipBgDisabled: 'surface',
  ChipFgDisabled: 'button-fg-disabled',
  TagNeutralBg: 'surface',
  TagNeutralFg: 'text-secondary',
  CardBg: 'surface-raised',
  CardBorder: 'border-subtle',
  ListRowBgPressed: 'surface',
  ToggleTrackOn: 'accent',
  ToggleTrackOff: 'neutral-500',
  ToggleThumb: 'surface-raised',
  SegmentTrack: 'surface',
  SegmentSelectedBg: 'surface-raised',
  SegmentFg: 'text-secondary',
  SegmentFgSelected: 'text-primary',
  ProgressTrack: 'border-subtle',
  ProgressFill: 'accent',
  LinkFg: 'text-brand',
  LinkFgPressed: 'brand-700',
  AmountPositive: 'success-fg',
  AmountNegative: 'text-primary',
  HeroBg: 'brand-400',
  ChatUserBg: 'brand-100',
  ChartFixed: 'neutral-400',
  ChartFlexible: 'neutral-300',
  ChartFree: 'accent',
  SheetHandle: 'border-strong',
  NavBg: 'surface-raised',
  NavIndicator: 'brand-100',
  NavFg: 'text-secondary',
  NavFgActive: 'text-primary',
  // Not in CLAUDE.md: read from the reference PNGs (see docs/ai-log.md)
  SuggestionBorder: 'purple-200',
  ValueEditUnderline: 'border-focus',
  DeviceBezel: 'neutral-900',
  DeviceStatusFg: 'text-primary',
};
const alias = (map) => Object.entries(map).map(([k, v]) => `  --${kebab(k)}: var(--${v});`);
const scrim = `  --scrim: ${hexToRgba(json.Neutral['900'].$value, 0.4)};`;

// ── Dimensions ────────────────────────────────────────────────────────────────
const dims = [
  ...[4, 8, 12, 16, 20, 24, 32, 40].map((n) => `  --space-${n}: ${n}px;`),
  ...Object.entries({ sm: 8, md: 12, lg: 20, full: 999 }).map(([k, v]) => `  --radius-${k}: ${v}px;`),
  '  --touch-target: 44px;',
  ...[16, 20, 24, 32].map((n) => `  --icon-${n}: ${n}px;`),
  '  --frame-width: 412px;',
  '  --frame-height: 917px;',
  '  --status-bar-height: 32px;',
  '  --gesture-bar-height: 24px;',
  '  --top-bar-height: 64px;',
  '  --bottom-nav-height: 80px;',
];

const section = (title, lines) => `\n  /* ${title} */\n${lines.join('\n')}`;
const css = `/* Generated by scripts/build-tokens.mjs from tokens/variables.json. Do not edit by hand. */
:root {${section('Primitives', primitives)}
${section('Shadows', shadows)}
${section('Fonts', fontFamilies)}
${section('Text styles (use with font:)', textStyles)}
${section('Semantics', alias(semantics))}
${section('Components', [...alias(components), scrim])}
${section('Dimensions', dims)}
}
`;

const out = fileURLToPath(new URL('src/styles/tokens.css', root));
writeFileSync(out, css);
console.log(`tokens.css: ${primitives.length} primitives, ${textStyles.length} text styles`);
