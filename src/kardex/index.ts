/**
 * The kardex engine: the balance, the snapshot by material and location, and
 * the movements a reception, a transfer, a count or an order write. Shared by
 * Portal and Inframaq so both keep the stock the same way.
 */
export * from './inputArrivalDate';
export * from './kardexBalance';
export * from './kardexMovements';
