import { expect, it, spyOn } from 'bun:test';
import '../setup-dom';
const { fireEvent, render, screen } = await import('@testing-library/react');

const { ErrorBoundary } = await import('@/components/ui/error-boundary');

it('shows a recoverable error for data exceptions instead of silently hiding the component', () => {
  const logError = spyOn(console, 'error').mockImplementation(() => {});
  let broken = true;
  function Content() {
    if (broken) throw new Error('Cannot read properties of undefined');
    return <p>Recovered dashboard</p>;
  }

  try {
    render(<ErrorBoundary><Content /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Component error');
    broken = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Recovered dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } finally {
    logError.mockRestore();
  }
});
