import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import Dashboard from '../components/Dashboard';
import theme from '../theme';
import { agents } from '../constants/agents';

const renderDashboard = () =>
  render(
    <ThemeProvider theme={theme}>
      <Dashboard />
    </ThemeProvider>
  );

describe('Dashboard', () => {
  it('renders the app bar title', () => {
    renderDashboard();
    expect(screen.getByText('Agentic Integration')).toBeInTheDocument();
  });

  it('renders all 7 agent cards', () => {
    renderDashboard();
    agents.forEach((agent) => {
      expect(screen.getByText(agent.name)).toBeInTheDocument();
    });
  });

  // U-D-05: clicking a card now opens a dialog (not Snackbar directly)
  it('U-D-05: clicking simple-reflex card opens the scenario dialog', async () => {
    renderDashboard();
    fireEvent.click(
      screen.getByRole('button', { name: /Esegui Simple Reflex Agents/i })
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  // U-D-06: clicking any card opens the dialog
  it('U-D-06: clicking any agent card opens the scenario dialog', async () => {
    renderDashboard();
    fireEvent.click(
      screen.getByRole('button', { name: /Esegui Learning Agents/i })
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
