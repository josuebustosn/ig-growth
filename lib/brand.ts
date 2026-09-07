// Brand configuration — the single file every component reads its identity from
// (issue #4). Values come from the environment, and every fallback is the current
// Trawi value, so a deployment that configures nothing keeps working exactly as
// the repo does today.
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

const name = process.env.NEXT_PUBLIC_BRAND_NAME || 'TrawiStats';

export const brand = {
    // Shown in the page headers, the browser tab, the share sheet and the
    // watermark of the shared image.
    name,

    // Lowercased into the file names of downloaded/shared images
    // (e.g. "trawistats-week.png").
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, ''),

    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION
        || 'Monitor de crecimiento de seguidores para Trawi Viajes',

    // Painted bottom-right on the shared PNG. Right-anchored at x = size - 40 and
    // sharing its baseline with the date drawn left-anchored at x = 40; nothing in
    // the canvas measures text, so a very long domain would run into the date.
    shareDomain: process.env.NEXT_PUBLIC_SHARE_DOMAIN || 'stats.trawi.net',

    // Which Instagram account the dashboard monitors. The API route still takes
    // the username from the query string (issue #3 tracks changing that), so this
    // only decides what the frontend asks for.
    defaultUsername: process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'trawi.viajes',

    // Asset paths, all under public/. The Trawi files keep their historical names;
    // another brand adds its own files and points these variables at them.
    headerLogo: process.env.NEXT_PUBLIC_BRAND_HEADER_LOGO || '/trawi-logo.jpg',
    favicon: process.env.NEXT_PUBLIC_BRAND_FAVICON || '/trawi-logo.jpg',

    // Drawn at a fixed 28x28 on the shared image, over a dark background at 60%
    // alpha — use a light variant, and square or near-square (anything wide gets
    // squashed into the box).
    canvasLogo: process.env.NEXT_PUBLIC_BRAND_CANVAS_LOGO || '/Trawi_Logo_Sinfondo.png',

    // Background of the shared image. Two forms:
    //   - a color ('#0F032D'): painted as a flat fill, with no blur and no darkening
    //     overlay — both exist to make text readable over a photo, and an 80% black
    //     overlay would crush any brand color to near-black.
    //   - an image path ('/Trawayana.png'): drawn oversized, blurred and darkened,
    //     exactly as the share image has always been built.
    shareBackground: process.env.NEXT_PUBLIC_BRAND_SHARE_BG || '/Trawayana.png',
};
