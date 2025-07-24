import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import { NumberButtonsComponent } from './number-buttons.component';

describe('NumberButtonsComponent', () => {
  it('should render number buttons and emit click events', async () => {
    const user = userEvent.setup();
    const numberClick = vi.fn();
    await render(NumberButtonsComponent, {
      inputs: {
        numLeft: Array.from({ length: 9 }, (_, i) => (i ? 2 : 0)),
        noteMode: false,
      },
      on: {
        numberClick,
      },
    });
    const oneButton = screen.getByText('1');
    expect(oneButton).toBeVisible();
    const zeroLeftText = screen.getByText('0');
    expect(zeroLeftText).toBeVisible();
    await user.click(screen.getByText('9'));
    expect(numberClick).toHaveBeenCalledWith(9);
  });
});
