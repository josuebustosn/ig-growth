// Brand configuration — the single file every component reads its identity from.
// Values come from the environment; the fallbacks are this repo's own instance
// (Piremos), so a clone that configures nothing still builds and looks finished.
//
// All variables are NEXT_PUBLIC_ on purpose. Every consumer except app/layout.tsx
// is a client component, none of them is a secret, and one uniform rule beats
// remembering which of two prefixes each value uses. The cost of that rule:
// NEXT_PUBLIC_ values are inlined at BUILD time — Next folds
// `process.env.NEXT_PUBLIC_X || 'fallback'` into a constant in the client bundle
// — so they must be configured before the first deploy, and changing one later
// requires a redeploy, not just an env edit.
// (Each variable below is referenced as a static `process.env.NEXT_PUBLIC_*`
// member expression because that is the only form the inliner recognizes.)

// A hex color may be written with or without the leading '#'. That matters because
// '#' opens a comment in a .env file, so NEXT_PUBLIC_BRAND_PRIMARY=#4E2BCC parses
// as an empty string and the fallback silently restores the default — the brand
// ships with someone else's color and nothing warns about it. Accepting the bare
// form removes the trap; the quoted form ("#4E2BCC") still works.
function hex(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim();
    return /^#?[0-9a-fA-F]{3,8}$/.test(raw) ? `#${raw.replace(/^#/, '')}` : fallback;
}

// Same normalization, but the value may also be an image path. Paths contain '/'
// and '.', so they never match the hex test and pass through untouched.
function colorOrPath(value: string | undefined, fallback: string): string {
    const raw = (value || '').trim();
    if (!raw) return fallback;
    return /^#?[0-9a-fA-F]{3,8}$/.test(raw) ? `#${raw.replace(/^#/, '')}` : raw;
}

// The brand name is the company ('Piremos'); the product name is this tool
// ('Stats'). Keeping them apart is what lets the header read "Piremos Stats"
// without baking the company into the product's own name.
const name = process.env.NEXT_PUBLIC_BRAND_NAME || 'Piremos';
const product = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Stats';

// Injected at build time from package.json by next.config.ts, so the version
// lives in exactly one place instead of being retyped in each surface.
const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

export const brand = {
    /** The company. Shown in the header and the shared image. */
    name,

    /** This tool. Rendered next to the company name, in a lighter weight. */
    product,

    /** "Piremos Stats" — browser tab, share sheet, image watermark. */
    fullName: `${name} ${product}`,

    /** Read from package.json at build time. Never retype it. */
    version,

    /** Lowercased into downloaded file names (e.g. "piremos-week.png"). */
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'stats',

    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION
        || `Crecimiento diario de seguidores de ${name} en Instagram.`,

    // Painted bottom-right on the shared PNG. Right-anchored at x = size - 40 and
    // sharing its baseline with the date drawn left-anchored at x = 40; nothing in
    // the canvas measures text, so a very long domain would run into the date.
    shareDomain: process.env.NEXT_PUBLIC_SHARE_DOMAIN || 'stats.piremos.com',

    /**
     * The Instagram account this dashboard tracks. This is the only account the
     * API will scrape — the route reads it server-side and ignores the query
     * string, so a stranger cannot spend our Apify credit on someone else.
     */
    username: process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'piremos.app',

    // Asset paths, all under public/.
    headerLogo: process.env.NEXT_PUBLIC_BRAND_HEADER_LOGO || '/piremos-icono.png',
    favicon: process.env.NEXT_PUBLIC_BRAND_FAVICON || '/piremos-icono.svg',

    /**
     * Drawn at a fixed 28x28 on the shared image, over a dark background at 60%
     * alpha — use a light variant, and square or near-square (anything wide gets
     * squashed into the box).
     */
    canvasLogo: process.env.NEXT_PUBLIC_BRAND_CANVAS_LOGO || '/piremos-icono-blanco.png',

    /**
     * The whole UI is derived from these six values via color-mix() in
     * globals.css, so a new brand needs six variables and its logo files —
     * not a pass through every component.
     */
    colors: {
        /** Primary brand color. Headings, the counter, the progress bar. */
        primary: hex(process.env.NEXT_PUBLIC_BRAND_PRIMARY, '#4E2BCC'),

        /** Secondary accent. The far end of every gradient. */
        accent: hex(process.env.NEXT_PUBLIC_BRAND_ACCENT, '#9471FF'),

        /** Growth, gains, "completed". Wants maximum contrast on dark. */
        positive: hex(process.env.NEXT_PUBLIC_BRAND_POSITIVE, '#C4F333'),

        /** Losses and errors. */
        negative: hex(process.env.NEXT_PUBLIC_BRAND_NEGATIVE, '#FF6B6B'),

        /** Dark theme background. Also the default background of the shared image. */
        dark: hex(process.env.NEXT_PUBLIC_BRAND_DARK, '#0F032D'),

        /** Light theme background. Piremos uses Blanco Humo, deliberately not #FFF. */
        light: hex(process.env.NEXT_PUBLIC_BRAND_LIGHT, '#EFEFEF'),
    },
};

/**
 * Background of the shared image. Two forms:
 *   - a color ('0F032D' or '#0F032D'): painted as a flat fill, with no blur and
 *     no darkening overlay — both exist to make text readable over a photo, and
 *     an 80% black overlay would crush any brand color to near-black.
 *   - an image path ('/fondo.jpg'): drawn oversized, blurred and darkened.
 * Defaults to the dark brand color, so the shared image is on-brand out of the box.
 */
export const shareBackground = colorOrPath(
    process.env.NEXT_PUBLIC_BRAND_SHARE_BG,
    brand.colors.dark,
);
