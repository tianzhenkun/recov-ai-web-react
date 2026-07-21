import fs from 'node:fs';
import path from 'node:path';

const readPage = (name: string) =>
  fs.readFileSync(path.join(__dirname, name, 'index.tsx'), 'utf8');

describe('Billing runtime action boundary', () => {
  it.each([
    'accounts',
    'charges',
    'payments',
    'reliability',
  ])('%s page does not gate actions behind a Billing capability preflight', (name) => {
    const source = readPage(name);
    expect(source).not.toMatch(
      /useBillingCapability|canCreateBusinessResults|canRunBillingBusinessAction/,
    );
  });

  it('keeps payment provider polling independent from a Billing capability preflight', () => {
    const source = readPage('payments');
    expect(source).not.toContain('shouldPollBillingBusinessResult');
    expect(source).toContain(
      '!orderDetailOpen || !shouldPollPaymentOrder(selectedOrder)',
    );
    expect(source).toContain(
      '!refundDetailOpen || !shouldPollPaymentRefund(selectedRefund)',
    );
  });
});
