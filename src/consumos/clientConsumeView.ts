/**
 * A plant consume as one of its clients sees it. A consume can back orders of two
 * rival clients, so it is always served cut down to the orders of whoever asks.
 * `sharedWithOtherClients` is worked out before the cut, because its totals then do
 * not belong to that client alone and nothing after the cut can tell.
 */

type ClientOrder = { sourceCompanyId?: string };

export type ClientConsumeView<T> = T & {
  orders: ClientOrder[];
  isProviderConsume?: boolean;
  providerCompanyName?: string;
  sharedWithOtherClients?: boolean;
};

export const clientConsumeView = <T extends { companyId: string; orders?: ClientOrder[] }>(consume: T, clientCompanyId: string, plantName: string): ClientConsumeView<T> => {
  if (consume.companyId === clientCompanyId) return consume as ClientConsumeView<T>;
  const orders = consume.orders ?? [];
  return {
    ...consume,
    orders: orders.filter((order) => order?.sourceCompanyId === clientCompanyId),
    isProviderConsume: true,
    providerCompanyName: plantName,
    sharedWithOtherClients: orders.some((order) => order?.sourceCompanyId && order.sourceCompanyId !== clientCompanyId),
  };
};
