/**
 * Number formatting, in one place.
 *
 * There used to be nine toLocaleString() calls across the components, split
 * between 'es-ES' and 'en-US', so the same screen showed "4232" in the counter
 * and "4,232 / 10k" in the goal bar. Formatting is a presentation decision; it
 * belongs in one module, not retyped at each call site.
 */

const LOCALE = 'es-ES';

// Spanish drops the thousands separator for four-digit integers ("4232"), which
// is correct prose but reads badly in a column of figures where five-digit rows
// do have one. Grouping is forced so a list stays visually aligned.
const GROUPED: Intl.NumberFormatOptions = { useGrouping: true };

/** 4232 -> "4.232" */
export function formatCount(value: number): string {
    return new Intl.NumberFormat(LOCALE, GROUPED).format(value);
}

/** 4232 -> "+4.232" / -12 -> "−12" (real minus sign, not a hyphen) */
export function formatDelta(value: number): string {
    if (value > 0) return `+${formatCount(value)}`;
    if (value < 0) return `−${formatCount(Math.abs(value))}`;
    return '0';
}

/**
 * 1892.16 -> "$1.892,16"
 *
 * Deliberately not Intl's `style: 'currency'`: with es-ES that renders
 * "1892,16 US$", trailing symbol and all, which is not how a price is written
 * in Venezuela. The symbol is prefixed by hand and only the number is localized.
 */
export function formatMoney(value: number): string {
    return `$${new Intl.NumberFormat(LOCALE, {
        ...GROUPED,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)}`;
}

/** 12500 -> "12,5k" · 1200000 -> "1,2M" — for axis ticks and goal labels. */
export function formatCompact(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value / 1_000_000)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value / 1_000)}k`;
    }
    return formatCount(value);
}
