// Brand configuration — the single file every component reads its identity from
// (issue #4). Values come from the environment, and every fallback is the current
// Piremos value, so a deployment that configures nothing renders as Piremos.
//
// All variables are NEXT_PUBLIC_ on purpose. Every consumer except app/layout.tsx
// is a client component, so the client needs almost all of them anyway; none of
// them is a secret; and one uniform rule beats remembering which of two prefixes
// each value uses. The cost of that rule: NEXT_PUBLIC_ values are inlined at
// BUILD time — Next folds `process.env.NEXT_PUBLIC_X || 'fallback'` into a
// constant in the client bundle — so they must be configured before the first
// deploy, and changing one later requires a redeploy, not just an env edit.
// (Each variable below is referenced as a static `process.env.NEXT_PUBLIC_*`
// member expression because that is the only form the inliner recognizes.)

// A hex color may be written with or without the leading '#'. That matters because
// '#' opens a comment in a .env file, so NEXT_PUBLIC_BRAND_SHARE_BG=#0F032D parses
// as an empty string and the fallback below silently restores the default image —
// the brand ships with someone else's background and nothing warns about it.
// Accepting the bare form removes the trap; the quoted form ("#0F032D") still works.
// Paths are left untouched: they contain '/' and '.', so they never match here.
function asShareBackground(value: string): string {
    return /^#?[0-9a-fA-F]{3,8}$/.test(value) ? `#${value.replace(/^#/, '')}` : value;
}

// The same '#' trap applies to the two brand colors, so they get the same treatment:
// bare or '#'-prefixed both work. They are stricter than the background above — exactly
// six hex digits — because the channels have to be split out for rgba() fills, and a
// CSS color name or an rgb() string would silently produce 'rgba(NaN, NaN, NaN, 0.12)'.
// Anything else falls back to the brand default instead of half-working.
function asHexColor(value: string | undefined, fallback: string): string {
    const v = (value || '').trim();
    return /^#?[0-9a-fA-F]{6}$/.test(v) ? `#${v.replace(/^#/, '')}` : fallback;
}

// '#4E2BCC' -> '78, 43, 204'. The UI needs the channels on their own to build
// translucent variants (`rgba(<channels>, 0.12)` for the soft button fills), and
// the canvas needs the hex. Deriving one from the other keeps a single literal.
// Input is always '#' plus six hex digits: asHexColor() guarantees it.
function toRgbChannels(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const name = process.env.NEXT_PUBLIC_BRAND_NAME || 'PiremosStats';

// The two ends of the brand gradient, used for the accent bar and the big number
// on the shared image, and exposed to CSS as --brand-primary / --brand-accent by
// app/layout.tsx (see globals.css).
//
// Order matters: --primary is a *text and border* color in six components, all of
// them over a dark background (both themes are dark: #1e1e2e and #0a0a0a). The lila
// clears 5.4:1 there; the deep purple only reaches 2.2:1, which is why the purple is
// the accent end and not the primary one.
const primary = asHexColor(process.env.NEXT_PUBLIC_BRAND_PRIMARY, '#9471FF');
const accent = asHexColor(process.env.NEXT_PUBLIC_BRAND_ACCENT, '#4E2BCC');

export const brand = {
    // Shown in the page headers, the browser tab, the share sheet and the
    // watermark of the shared image.
    name,

    // Lowercased into the file names of downloaded/shared images
    // (e.g. "piremosstats-week.png").
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, ''),

    // Single source of truth for the version, injected from package.json by
    // next.config.ts. It used to be typed by hand in three places and two of them
    // had already drifted apart (1.3.1 in the pages, 1.3 on the canvas, 0.1.0 in
    // package.json). The fallback only shows up if the config stopped injecting it.
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',

    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION
        || 'Monitor de crecimiento de seguidores para Piremos',

    // Painted bottom-right on the shared PNG. Right-anchored at x = size - 40 and
    // sharing its baseline with the date drawn left-anchored at x = 40; nothing in
    // the canvas measures text, so a very long domain would run into the date.
    //
    // Empty by default, and deliberately so: this line is published on every image that
    // goes out, and a made-up domain that resolves nowhere is worse than no domain at all.
    // The canvas drops the line when this is empty and keeps the rest of the watermark on
    // the same baseline, so an unconfigured deployment simply shows no address. Set
    // NEXT_PUBLIC_SHARE_DOMAIN once the real one exists.
    shareDomain: process.env.NEXT_PUBLIC_SHARE_DOMAIN || '',

    // Which Instagram account the dashboard monitors. The API route still takes
    // the username from the query string (issue #3 tracks changing that), so this
    // only decides what the frontend asks for.
    defaultUsername: process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'piremos.app',

    // Asset paths, all under public/. Both themes are dark, so the header takes the
    // light mark; the favicon sits in browser chrome that may be light, so it takes
    // the purple one, which reads on either.
    headerLogo: process.env.NEXT_PUBLIC_BRAND_HEADER_LOGO || '/piremos-icono-blanco.png',
    favicon: process.env.NEXT_PUBLIC_BRAND_FAVICON || '/piremos-icono.png',

    // Drawn at a fixed 28x28 on the shared image, over a dark background at 60%
    // alpha — use a light variant, and square or near-square (anything wide gets
    // squashed into the box).
    canvasLogo: process.env.NEXT_PUBLIC_BRAND_CANVAS_LOGO || '/piremos-icono-blanco.png',

    // Background of the shared image. Two forms:
    //   - a color ('0F032D' or '#0F032D'): painted as a flat fill, with no blur and no darkening
    //     overlay — both exist to make text readable over a photo, and an 80% black
    //     overlay would crush any brand color to near-black.
    //   - an image path ('/foto.png'): drawn oversized, blurred and darkened,
    //     exactly as the share image has always been built.
    shareBackground: asShareBackground(process.env.NEXT_PUBLIC_BRAND_SHARE_BG || '#0F032D'),

    colors: {
        primary,
        accent,
        primaryRgb: toRgbChannels(primary),
    },
};
