import { getVisibleColumns } from './_shared';

describe('litigation process column schema', () => {
  it('shows overdue days immediately after node status', () => {
    const columns = getVisibleColumns('MATERIAL_SUBMIT');
    const statusIndex = columns.findIndex((item) => item.prop === 'status');
    const overdueDaysIndex = columns.findIndex(
      (item) => item.prop === 'overdueDays',
    );

    expect(statusIndex).toBeGreaterThan(-1);
    expect(overdueDaysIndex).toBe(statusIndex + 1);
    expect(columns[overdueDaysIndex]).toMatchObject({
      label: '逾期天数',
      type: 'days',
      align: 'center',
    });
  });
});
