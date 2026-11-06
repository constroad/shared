/** A number as Lila says it: at most two decimals, and 0 for what is not a number. */
export const num = (value: number): string =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
