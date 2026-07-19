import { act, render, screen } from '@testing-library/react';
import * as React from 'react';

let mockMenuListener: ((routes: any[]) => void) | undefined;
const mockGetCachedRuoyiRoutes = jest.fn(() => []);
let mockFlowModuleLoaded = false;

jest.mock('@/adapters/ruoyi/menu', () => ({
  getCachedRuoyiRoutes: mockGetCachedRuoyiRoutes,
  subscribeRuoyiMenuCatalog: (listener: (routes: any[]) => void) => {
    mockMenuListener = listener;
    return jest.fn();
  },
}));

jest.mock('@/modules/recov/extensions/loadFlowEventExtension', () => ({
  loadFlowEventExtension: async () => {
    mockFlowModuleLoaded = true;
    return { default: () => <div>Recov 流程扩展</div> };
  },
}));

const { AppExtensions } = require('./index');

const renderExtensions = (authorizedRoutes: any[]) =>
  render(
    <AppExtensions
      authorizedRoutes={authorizedRoutes}
      contextKey="user:tenant"
      floatingProcessPanelDefaultMode="normal"
      signedIn
    />,
  );

describe('AppExtensions', () => {
  it('does not mount Recov extensions on a Sales-only site', () => {
    renderExtensions([
      {
        component: 'Layout',
        path: '/sales',
        children: [{ component: 'sales/dashboard', path: 'dashboard' }],
      },
    ]);

    expect(screen.queryByText('Recov 流程扩展')).toBeNull();
    expect(mockFlowModuleLoaded).toBe(false);
  });

  it('mounts Recov extensions when the backend grants flow events', async () => {
    renderExtensions([{ component: 'recov/flowEvents', path: '/flow-events' }]);

    expect(await screen.findByText('Recov 流程扩展')).toBeTruthy();
    expect(mockFlowModuleLoaded).toBe(true);
  });

  it('reacts when a retried menu load publishes a new authorization catalog', async () => {
    render(
      <AppExtensions
        contextKey="user:tenant"
        floatingProcessPanelDefaultMode="normal"
        signedIn
      />,
    );

    expect(screen.queryByText('Recov 流程扩展')).toBeNull();
    expect(mockMenuListener).toEqual(expect.any(Function));

    act(() => {
      mockMenuListener?.([
        { component: 'recov/flowEvents', path: '/flow-events' },
      ]);
    });

    expect(await screen.findByText('Recov 流程扩展')).toBeTruthy();
  });
});
