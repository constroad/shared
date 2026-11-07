/**
 * "What the client sees" — PRESENTATION overrides of a dispatch.
 *
 * A dispatch has THREE m³ values that must NOT be mixed:
 * - `planedQuantity` — the planned amount. It is what drives the **batches**
 *   (`computeM3DiffToDispatch(planedQuantity, transport.m3)`): nothing here touches it.
 * - `quantity` — what was actually loaded at the plant. INTERNAL data and the
 *   basis of the settlement.
 * - `placeholders.m3Dispatched` / `m3Truck` — override shown to the OUTSIDE
 *   (PDF voucher, WhatsApp notice and client portal/report). It is not a
 *   measurement: it is what the client must read.
 *
 * Core rule: **0 and empty mean the same — NO override**. Before, each consumer
 * decided on its own (`??` keeps the 0, `||` drops it), so a saved 0 made the
 * voucher print "0 m³" while the settlement fell back to the real value. Every
 * read of the override goes through here.
 */

type ClientFacingPlaceholders = {
  m3Dispatched?: number | null;
  m3Truck?: number | null;
};

/** True only if the override is a usable number (finite and > 0). */
export const hasClientFacingM3 = (value?: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const firstUsable = (...values: Array<number | null | undefined>): number => {
  const found = values.find((value) => hasClientFacingM3(value));
  return found ?? 0;
};

/** The trip's m³ as the client must see it (voucher, WhatsApp, report). */
export const resolveClientFacingM3 = (dispatch: {
  placeholders?: ClientFacingPlaceholders | null;
  quantity?: number | null;
  planedQuantity?: number | null;
}): number =>
  firstUsable(
    dispatch.placeholders?.m3Dispatched,
    dispatch.quantity,
    dispatch.planedQuantity
  );

/**
 * Total m³ of the ORDER as the client must see it.
 *
 * The Mongo aggregate (`order.repository`) computes TWO sums of the same group:
 * - `m3dispatched` — sum of the real `quantity`. It feeds money (finance),
 *   kardex, consumptions and the admin's internal tables. It is NOT touched.
 * - `m3dispatchedClientFacing` — the same sum but applying the per-dispatch
 *   override. It is the only one that may be shown to the client.
 *
 * The fallback to the real one covers old/cached payloads that lack the field.
 */
export const resolveOrderClientFacingM3 = (order: {
  m3dispatched?: number | null;
  m3dispatchedClientFacing?: number | null;
}): number => {
  const clientFacing = order.m3dispatchedClientFacing;
  if (typeof clientFacing === 'number' && Number.isFinite(clientFacing)) return clientFacing;
  const real = order.m3dispatched;
  return typeof real === 'number' && Number.isFinite(real) ? real : 0;
};

/** The truck's capacity as the client must see it. */
export const resolveClientFacingTruckM3 = (params: {
  placeholders?: ClientFacingPlaceholders | null;
  transportM3?: number | null;
}): number | undefined => {
  if (hasClientFacingM3(params.placeholders?.m3Truck)) return params.placeholders!.m3Truck!;
  if (hasClientFacingM3(params.transportM3)) return params.transportM3!;
  return undefined;
};
