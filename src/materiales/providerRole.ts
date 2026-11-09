/**
 * Who counts as a carrier and who as a quarry, in one place.
 *
 * A provider is not typed by a `role` column: it carries flags
 * (`transportsMaterials`, `acceptsInputReception`, `acceptsAggregateReception`,
 * `sellsMaterials`) and the reception form asks for two lists built out of them.
 * Every app that offers those lists must build them with THIS filter, or it will
 * offer a provider the screen does not offer. Pure: it returns the Mongo filter,
 * it does not query.
 */

/** The two roles the reception asks for. */
export type ProviderRole = 'transport' | 'seller';

export function providerRoleFilter(role: ProviderRole): Record<string, unknown> {
  if (role === 'seller') return { $or: [{ sellsMaterials: true }] };
  // A carrier is anybody who moves material or is accepted at the gate.
  return {
    $or: [{ transportsMaterials: true }, { acceptsInputReception: true }, { acceptsAggregateReception: true }],
  };
}
