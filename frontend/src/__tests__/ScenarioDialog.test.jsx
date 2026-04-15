import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import ScenarioDialog from '../components/ScenarioDialog';
import { agents } from '../constants/agents';

const simpleReflexAgent = agents.find((a) => a.id === 'simple-reflex');
const modelBasedAgent = agents.find((a) => a.id === 'model-based-reflex');

const renderDialog = (agent, open = true, onClose = vi.fn()) =>
  render(
    <ThemeProvider theme={theme}>
      <ScenarioDialog open={open} agent={agent} onClose={onClose} />
    </ThemeProvider>
  );

// ── agents.js data shape tests ────────────────────────────────────────────────

describe('agents.js scenarios field', () => {
  it('U-SD-10: tutti i 7 agenti hanno il campo scenarios (array)', () => {
    agents.forEach((agent) => {
      expect(Array.isArray(agent.scenarios)).toBe(true);
    });
  });

  it('U-SD-11: simple-reflex ha esattamente 2 scenari', () => {
    expect(simpleReflexAgent.scenarios).toHaveLength(2);
  });

  it('U-SD-12: gli altri 6 agenti hanno scenarios vuoto', () => {
    const others = agents.filter((a) => a.id !== 'simple-reflex');
    others.forEach((agent) => {
      expect(agent.scenarios).toHaveLength(0);
    });
  });
});

// ── ScenarioDialog rendering ──────────────────────────────────────────────────

describe('ScenarioDialog — step: select', () => {
  it('U-SD-01: mostra due scenario card per simple-reflex', () => {
    renderDialog(simpleReflexAgent);
    expect(screen.getByText('Password Reset')).toBeInTheDocument();
    expect(screen.getByText('Carrello Abbandonato')).toBeInTheDocument();
  });

  it('U-SD-08: mostra messaggio per agente senza scenari', () => {
    renderDialog(modelBasedAgent);
    expect(screen.getByText(/nessuno scenario configurato/i)).toBeInTheDocument();
  });
});

describe('ScenarioDialog — step: form', () => {
  it('U-SD-02: selezionando Password Reset mostra i campi corretti', () => {
    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    expect(screen.getByLabelText(/ID Utente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('U-SD-03: selezionando Carrello Abbandonato mostra i campi corretti', () => {
    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario carrello abbandonato/i));
    expect(screen.getByLabelText(/ID Cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ID Carrello/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Valore Carrello/i)).toBeInTheDocument();
  });

  it('U-SD-04: bottone Avvia disabilitato con form vuoto', () => {
    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    const avviaBtn = screen.getByRole('button', { name: /avvia/i });
    expect(avviaBtn).toBeDisabled();
  });
});

describe('ScenarioDialog — API call', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-SD-05: API call riuscita mostra il risultato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        event_id: 'test-uuid',
        status: 'success',
        outcome: 'Email di reset inviata con successo',
        actions_taken: ['reset_email_sent'],
        processed_at: new Date().toISOString(),
      }),
    }));

    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    fireEvent.change(screen.getByLabelText(/ID Utente/i), { target: { value: 'user-001' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }));

    await waitFor(() => {
      expect(screen.getByText(/email di reset inviata/i)).toBeInTheDocument();
    });
  });

  it('U-SD-06: API restituisce 500 mostra messaggio errore', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Errore interno durante elaborazione' }),
    }));

    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    fireEvent.change(screen.getByLabelText(/ID Utente/i), { target: { value: 'user-001' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }));

    await waitFor(() => {
      expect(screen.getByText(/errore interno/i)).toBeInTheDocument();
    });
  });

  it('U-SD-07: API restituisce 409 mostra evento già elaborato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 409,
      json: async () => ({
        event_id: 'test-uuid',
        status: 'skipped',
        outcome: 'Evento già elaborato',
        actions_taken: [],
        processed_at: new Date().toISOString(),
      }),
    }));

    renderDialog(simpleReflexAgent);
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    fireEvent.change(screen.getByLabelText(/ID Utente/i), { target: { value: 'user-001' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /avvia/i }));

    await waitFor(() => {
      expect(screen.getByText(/già elaborato/i)).toBeInTheDocument();
    });
  });
});

describe('ScenarioDialog — state reset', () => {
  it('U-SD-09: chiudere e riaprire il dialog resetta lo stato al passo select', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ScenarioDialog open={true} agent={simpleReflexAgent} onClose={onClose} />
      </ThemeProvider>
    );

    // Naviga al form
    fireEvent.click(screen.getByLabelText(/seleziona scenario password reset/i));
    expect(screen.getByLabelText(/ID Utente/i)).toBeInTheDocument();

    // Chiudi (click Annulla non disponibile in form, usa Indietro poi Annulla)
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }));

    // Riapri
    rerender(
      <ThemeProvider theme={theme}>
        <ScenarioDialog open={true} agent={simpleReflexAgent} onClose={onClose} />
      </ThemeProvider>
    );

    // Deve essere tornato al passo select
    expect(screen.getByText('Password Reset')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ID Utente/i)).not.toBeInTheDocument();
  });
});
