import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import SiderFooterAction from './index';

describe('SiderFooterAction', () => {
  it('forwards injected trigger props to the real interactive element', () => {
    const handleMouseEnter = jest.fn();
    const { container } = render(
      createElement(SiderFooterAction as any, {
        'data-probe': 'dropdown-trigger',
        icon: createElement('span'),
        label: '用户菜单',
        onMouseEnter: handleMouseEnter,
      }),
    );

    const trigger = container.querySelector('button');
    expect(trigger?.getAttribute('data-probe')).toBe('dropdown-trigger');

    fireEvent.mouseEnter(trigger as Element);
    expect(handleMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('renders dot badge without exposing the count text', () => {
    const { container } = render(
      createElement(SiderFooterAction, {
        badgeCount: 19,
        badgeVariant: 'dot',
        icon: createElement('span'),
        label: '通知中心',
      }),
    );

    const badge = container.querySelector('.recov-sider-footer-action-count');
    expect(
      badge?.classList.contains('recov-sider-footer-action-count-dot'),
    ).toBe(true);
    expect(badge?.textContent).toBe('');
    expect(container.textContent).toBe('通知中心');
  });
});
