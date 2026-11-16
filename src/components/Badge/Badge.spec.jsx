import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './Badge';
import { STUDENT_STATUS } from '@data/enums';

describe('StatusBadge', () => {
  it('shows the label for an API status', () => {
    render(<StatusBadge map={STUDENT_STATUS} value="prospect" />);
    expect(screen.getByText('Waiting list')).toBeInTheDocument();
  });
});
