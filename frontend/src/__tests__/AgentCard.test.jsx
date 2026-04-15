import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgentCard from '../components/AgentCard';

const mockAgent = {
  id: 'simple-reflex',
  name: 'Simple Reflex Agents',
  description: 'React directly to current percepts using condition-action rules.',
  Icon: () => <span data-testid="agent-icon" />,
  color: '#1565c0',
};

describe('AgentCard', () => {
  it('renders agent name', () => {
    render(<AgentCard agent={mockAgent} onRun={vi.fn()} />);
    expect(screen.getByText('Simple Reflex Agents')).toBeInTheDocument();
  });

  it('renders agent description', () => {
    render(<AgentCard agent={mockAgent} onRun={vi.fn()} />);
    expect(
      screen.getByText('React directly to current percepts using condition-action rules.')
    ).toBeInTheDocument();
  });

  it('renders Esegui chip', () => {
    render(<AgentCard agent={mockAgent} onRun={vi.fn()} />);
    expect(screen.getByText('Esegui')).toBeInTheDocument();
  });

  it('calls onRun with the agent object when clicked', () => {
    const onRun = vi.fn();
    render(<AgentCard agent={mockAgent} onRun={onRun} />);
    fireEvent.click(screen.getByRole('button', { name: /Esegui Simple Reflex Agents/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledWith(mockAgent);
  });
});
