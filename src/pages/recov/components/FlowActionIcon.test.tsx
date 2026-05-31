import { render } from '@testing-library/react';
import React from 'react';
import { getFlowActionIcon } from './FlowActionIcon';

describe('getFlowActionIcon', () => {
  it('uses the exception icon for abnormal flow actions and the progress icon otherwise', () => {
    const { container, rerender } = render(getFlowActionIcon(true));

    expect(
      container.querySelector('.anticon-exclamation-circle'),
    ).not.toBeNull();

    rerender(getFlowActionIcon(false));

    expect(container.querySelector('.anticon-field-time')).not.toBeNull();
  });
});
