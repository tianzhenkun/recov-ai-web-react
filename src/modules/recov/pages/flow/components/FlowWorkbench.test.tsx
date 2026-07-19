import { render, screen } from '@testing-library/react';
import * as React from 'react';
import {
  getDebtCityOptions,
  getDebtOrganizationOptions,
} from '@/modules/recov/services/datelligence';
import { pageFlowInstances } from '@/modules/recov/services/flowInstance';
import FlowWorkbench from './FlowWorkbench';

jest.mock('@/modules/recov/services/datelligence', () => ({
  getDebtCityOptions: jest.fn(),
  getDebtOrganizationOptions: jest.fn(),
}));

jest.mock('@/modules/recov/services/flowBatchStart', () => ({
  getFlowBatchFailurePage: jest.fn(),
  getFlowBatchProgress: jest.fn(),
  retryFlowBatchFailures: jest.fn(),
  startFlowBatch: jest.fn(),
}));

jest.mock('@/modules/recov/services/flowInstance', () => ({
  pageFlowInstances: jest.fn(),
}));

const getDebtCityOptionsMock = getDebtCityOptions as jest.Mock;
const getDebtOrganizationOptionsMock = getDebtOrganizationOptions as jest.Mock;
const pageFlowInstancesMock = pageFlowInstances as jest.Mock;

describe('FlowWorkbench', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDebtCityOptionsMock.mockResolvedValue({ data: [] });
    getDebtOrganizationOptionsMock.mockResolvedValue({ data: [] });
    pageFlowInstancesMock.mockResolvedValue({ rows: [], total: 0 });
  });

  it('does not expose flow start controls', async () => {
    render(<FlowWorkbench mode="embedded" />);

    expect((await screen.findAllByText('流程实例')).length).toBeGreaterThan(0);

    expect(screen.queryByText('流程批量发起')).toBeNull();
    expect(screen.queryByText('发起催收流程')).toBeNull();
    expect(screen.queryByText('批次发起进度')).toBeNull();
  });
});
