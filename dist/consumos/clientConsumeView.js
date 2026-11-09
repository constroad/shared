"use strict";
/**
 * A plant consume as one of its clients sees it. A consume can back orders of two
 * rival clients, so it is always served cut down to the orders of whoever asks.
 * `sharedWithOtherClients` is worked out before the cut, because its totals then do
 * not belong to that client alone and nothing after the cut can tell.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientConsumeView = void 0;
const clientConsumeView = (consume, clientCompanyId, plantName) => {
    if (consume.companyId === clientCompanyId)
        return consume;
    const orders = consume.orders ?? [];
    return {
        ...consume,
        orders: orders.filter((order) => order?.sourceCompanyId === clientCompanyId),
        isProviderConsume: true,
        providerCompanyName: plantName,
        sharedWithOtherClients: orders.some((order) => order?.sourceCompanyId && order.sourceCompanyId !== clientCompanyId),
    };
};
exports.clientConsumeView = clientConsumeView;
