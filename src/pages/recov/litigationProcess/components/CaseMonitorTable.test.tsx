import { fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import CaseMonitorTable from './CaseMonitorTable';

jest.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: {
      currentUser: {
        roles: ['admin'],
        permissions: ['*:*:*'],
      },
    },
  }),
}));

const row = {
  id: '900',
  flowId: '8001',
  debtNumber: 1,
  city: '广州市',
  organization: '越秀天宸',
  debtorName: '田先生',
  debtAmount: '4188',
  overdueAmount: '126',
  overdueDays: 141,
  courtName: '广州市越秀区人民法院',
  caseNo: null,
  status: '0' as const,
  failReason: null,
  result: null,
};

describe('CaseMonitorTable actions', () => {
  it('renders an independent filing-materials action', () => {
    const onViewMaterials = jest.fn();

    render(
      React.createElement(
        ConfigProvider,
        null,
        React.createElement(CaseMonitorTable, {
          nodeType: 'WAITING_FILING',
          rows: [row],
          total: 1,
          pageNum: 1,
          pageSize: 10,
          debtNumberFilter: '',
          cityFilter: '',
          organizationFilter: '',
          onFilterSearch: jest.fn(),
          onFilterReset: jest.fn(),
          onPageChange: jest.fn(),
          onViewDetail: jest.fn(),
          onViewMaterials,
          onViewFlow: jest.fn(),
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '立案材料' }));

    expect(onViewMaterials).toHaveBeenCalledWith(row);
  });
});
