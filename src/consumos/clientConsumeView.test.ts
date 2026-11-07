import { clientConsumeView } from './clientConsumeView';

const consume = {
  companyId: 'plant',
  totalCubes: 100,
  orders: [
    { orderId: 'o-1', sourceCompanyId: 'constroad' },
    { orderId: 'o-2', sourceCompanyId: 'globofast' },
    { orderId: 'o-3' },
  ],
};

describe('clientConsumeView', () => {
  it('cuts the orders down to the company asking, and names the plant', () => {
    const view = clientConsumeView(consume, 'constroad', 'INFRAMAQ');

    expect(view.orders).toEqual([{ orderId: 'o-1', sourceCompanyId: 'constroad' }]);
    expect(view).toMatchObject({ isProviderConsume: true, providerCompanyName: 'INFRAMAQ', sharedWithOtherClients: true });
  });

  it('says when the whole consume belongs to one client', () => {
    const own = { ...consume, orders: [{ orderId: 'o-1', sourceCompanyId: 'constroad' }] };

    expect(clientConsumeView(own, 'constroad', 'INFRAMAQ').sharedWithOtherClients).toBe(false);
  });

  it('counts the plant own orders as nobody else', () => {
    const own = { ...consume, orders: [{ orderId: 'o-1', sourceCompanyId: 'constroad' }, { orderId: 'o-3' }] };

    expect(clientConsumeView(own, 'constroad', 'INFRAMAQ').sharedWithOtherClients).toBe(false);
  });

  it('hands its owner the consume untouched', () => {
    expect(clientConsumeView(consume, 'plant', 'INFRAMAQ')).toBe(consume);
  });

  it('takes a consume with no orders', () => {
    const view = clientConsumeView({ companyId: 'plant' }, 'constroad', 'INFRAMAQ');

    expect(view.orders).toEqual([]);
    expect(view.sharedWithOtherClients).toBe(false);
  });
});
