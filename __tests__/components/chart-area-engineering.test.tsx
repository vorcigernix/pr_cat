import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ChartAreaEngineering } from '@/components/chart-area-engineering';
import { useIsMobile } from '@/hooks/use-mobile';

jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: () => null,
}));

const originalMatchMedia = window.matchMedia;
let mediaQuery: MediaQueryList;

beforeEach(() => {
  mediaQuery = Object.assign(new EventTarget(), {
    matches: false, media: '(max-width: 767px)', onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
  });
  window.matchMedia = jest.fn(() => mediaQuery);
});

afterAll(() => { window.matchMedia = originalMatchMedia; });

function setMobile(matches: boolean) {
  act(() => {
    Object.defineProperty(mediaQuery, 'matches', { value: matches, configurable: true });
    mediaQuery.dispatchEvent(new Event('change'));
  });
}

it('updates responsive chart defaults in both directions and releases the media subscription', () => {
  const removeListener = jest.spyOn(mediaQuery, 'removeEventListener');
  const view = render(<ChartAreaEngineering chartData={[]} />);
  const codingHours = screen.getByRole('button', { name: 'Estimated coding hours' });
  expect(codingHours).toHaveAttribute('aria-pressed', 'true');

  setMobile(true);
  expect(codingHours).toHaveAttribute('aria-pressed', 'false');
  setMobile(false);
  expect(codingHours).toHaveAttribute('aria-pressed', 'true');
  expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');

  view.unmount();
  expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
});

it('preserves explicit metric choices across viewport changes and keeps at least one series', () => {
  render(<ChartAreaEngineering chartData={[]} />);
  const shipping = screen.getByRole('button', { name: 'Shipping Velocity' });
  const delivery = screen.getByRole('button', { name: 'Delivery Speed (hrs)' });
  const coding = screen.getByRole('button', { name: 'Estimated coding hours' });
  fireEvent.click(delivery);
  fireEvent.click(coding);
  fireEvent.click(shipping);
  expect(shipping).toHaveAttribute('aria-pressed', 'true');

  setMobile(true);
  setMobile(false);
  expect(shipping).toHaveAttribute('aria-pressed', 'true');
  expect(delivery).toHaveAttribute('aria-pressed', 'false');
  expect(coding).toHaveAttribute('aria-pressed', 'false');
});

function Viewport() {
  return <span>{useIsMobile() ? 'mobile' : 'desktop'}</span>;
}

it('uses a stable server snapshot and reads the real viewport after hydration', () => {
  setMobile(true);
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Viewport />);
  expect(container).toHaveTextContent('desktop');
  expect(window.matchMedia).not.toHaveBeenCalled();

  render(<Viewport />, { container, hydrate: true });
  expect(container).toHaveTextContent('mobile');
});
