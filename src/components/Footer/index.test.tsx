import { render, screen } from '@testing-library/react';
import * as React from 'react';
import Footer from './index';

describe('Footer', () => {
  it('renders the active site brand', () => {
    render(<Footer title="Sales Agent" />);

    expect(screen.getByText(/Sales Agent/)).toBeTruthy();
    expect(screen.queryByText(/Recov Agent/)).toBeNull();
  });

  it('uses the neutral brand by default', () => {
    render(<Footer />);

    expect(screen.getByText(/LingChen AI/)).toBeTruthy();
  });
});
