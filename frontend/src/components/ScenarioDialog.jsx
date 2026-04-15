import { useCallback, useEffect, useRef, useState } from 'react';
import { keyframes } from '@mui/system';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArchitectureFlow from './ArchitectureFlow';
import { FLOW_STEPS } from '../constants/flowSteps';

const INITIAL_STATE = {
  step: 'select', // 'select' | 'form' | 'loading' | 'result'
  selectedScenario: null,
  formValues: {},
  result: null,
  error: null,
  logLines: [],
};

const logBlink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
`;

function normalizePayload(scenario, formValues) {
  const payload = { ...formValues };
  scenario.fields.forEach((field) => {
    if (field.type === 'number' && payload[field.name] !== undefined) {
      payload[field.name] = parseFloat(payload[field.name]);
    }
  });
  return payload;
}

function isFormValid(scenario, formValues) {
  return scenario.fields
    .filter((f) => f.required)
    .every((f) => {
      const val = formValues[f.name];
      return val !== undefined && String(val).trim() !== '';
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScenarioSelector({ scenarios, selectedId, onSelect }) {
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      {scenarios.map((scenario) => {
        const isSelected = selectedId === scenario.id;
        return (
          <Grid item xs={12} sm={6} key={scenario.id}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                transition: 'border-color 0.2s',
              }}
            >
              <CardActionArea
                onClick={() => onSelect(scenario)}
                sx={{ height: '100%', p: 1 }}
                aria-label={`Seleziona scenario ${scenario.label}`}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {scenario.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {scenario.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

function ScenarioForm({ scenario, formValues, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      {scenario.fields.map((field) => (
        <TextField
          key={field.name}
          label={field.label}
          type={field.type === 'number' ? 'text' : field.type}
          inputProps={field.type === 'number' ? { inputMode: 'decimal' } : undefined}
          value={formValues[field.name] ?? ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          fullWidth
          variant="outlined"
        />
      ))}
    </Box>
  );
}

function ResultPanel({ result, error }) {
  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Alert severity="error" icon={<ErrorOutlineIcon />}>
          {error}
        </Alert>
      </Box>
    );
  }

  const severityMap = { success: 'success', skipped: 'warning', error: 'error' };
  const severity = severityMap[result?.status] ?? 'info';
  const iconMap = {
    success: <CheckCircleOutlineIcon />,
    skipped: <InfoOutlinedIcon />,
    error: <ErrorOutlineIcon />,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <Alert severity={severity} icon={iconMap[result?.status]}>
        {result?.outcome}
      </Alert>

      {result?.actions_taken?.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Azioni eseguite
          </Typography>
          <List dense disablePadding>
            {result.actions_taken.map((action) => (
              <ListItem key={action} disableGutters sx={{ py: 0.25 }}>
                <Chip
                  label={action}
                  size="small"
                  variant="outlined"
                  color={severity}
                  sx={{ mt: 0.25 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {result?.event_id && (
        <Typography variant="caption" color="text.disabled">
          event_id: {result.event_id}
        </Typography>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScenarioDialog({ open, agent, onClose }) {
  const [state, setState] = useState(INITIAL_STATE);

  // Coordination refs: animation and API call may complete in any order
  const animDoneRef = useRef(false);
  const pendingResultRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!agent) return null;

  const { step, selectedScenario, formValues, result, error, logLines } = state;
  const hasScenarios = agent.scenarios && agent.scenarios.length > 0;
  const agentColor = agent.color ?? '#1565c0';
  const flowSteps = selectedScenario ? (FLOW_STEPS[selectedScenario.eventType] ?? []) : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleScenarioSelect = (scenario) => {
    setState((s) => ({ ...s, selectedScenario: scenario, step: 'form', formValues: {} }));
  };

  const handleFieldChange = (name, value) => {
    setState((s) => ({ ...s, formValues: { ...s.formValues, [name]: value } }));
  };

  const handleBack = () => {
    setState((s) => ({ ...s, step: 'select', selectedScenario: null, formValues: {} }));
  };

  const handleClose = () => {
    onClose(result ? { ...result } : error ? { error } : null);
    animDoneRef.current = false;
    pendingResultRef.current = null;
    setState(INITIAL_STATE);
  };

  /** Show result immediately or buffer it until the animation completes. */
  const resolveResult = useCallback((resultData) => {
    if (animDoneRef.current) {
      if (mountedRef.current) {
        setState((s) => ({ ...s, step: 'result', result: resultData.result, error: resultData.error }));
      }
    } else {
      pendingResultRef.current = resultData;
    }
  }, []);

  // Ref to auto-scroll the log panel to the bottom on each new entry
  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [logLines]);

  /** Called by ArchitectureFlow each time a node activates — appends a log line. */
  const handleStepActivate = useCallback((_index, step) => {
    if (!step.log) return;
    const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setState((s) => ({ ...s, logLines: [...s.logLines, { time, message: step.log }] }));
  }, []);

  /** Called by ArchitectureFlow when the last node lights up. */
  const handleAnimationComplete = useCallback(() => {
    animDoneRef.current = true;
    if (pendingResultRef.current !== null && mountedRef.current) {
      const buffered = pendingResultRef.current;
      pendingResultRef.current = null;
      setState((s) => ({ ...s, step: 'result', result: buffered.result, error: buffered.error }));
    }
  }, []);

  const handleSubmit = async () => {
    animDoneRef.current = false;
    pendingResultRef.current = null;
    setState((s) => ({ ...s, step: 'loading', error: null, logLines: [] }));

    const payload = normalizePayload(selectedScenario, formValues);
    const envelope = {
      event_id: crypto.randomUUID(),
      event_type: selectedScenario.eventType,
      timestamp: new Date().toISOString(),
      source: 'dashboard',
      correlation_id: crypto.randomUUID(),
      payload,
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        resolveResult({
          result: {
            ...data,
            status: 'skipped',
            outcome: data.outcome || 'Evento già elaborato in precedenza',
          },
          error: null,
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore HTTP ${res.status}`);
      }

      const data = await res.json();
      resolveResult({ result: data, error: null });
    } catch (err) {
      resolveResult({ result: null, error: err.message || 'Errore di connessione al backend' });
    }
  };

  // ── Titles ────────────────────────────────────────────────────────────────

  const dialogTitle = () => {
    if (!hasScenarios) return agent.name;
    if (step === 'select') return `Seleziona scenario — ${agent.name}`;
    if (step === 'form') return selectedScenario?.label ?? '';
    if (step === 'loading') return 'Elaborazione in corso...';
    if (step === 'result') {
      return result?.status === 'success' ? 'Eseguito con successo' : 'Elaborazione completata';
    }
    return agent.name;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={step === 'loading' ? null : handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="scenario-dialog-title"
    >
      <DialogTitle id="scenario-dialog-title">{dialogTitle()}</DialogTitle>

      <DialogContent dividers>
        {/* No scenarios configured */}
        {!hasScenarios && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Nessuno scenario configurato per questo agente.
          </Typography>
        )}

        {/* Step: select */}
        {hasScenarios && step === 'select' && (
          <ScenarioSelector
            scenarios={agent.scenarios}
            selectedId={selectedScenario?.id}
            onSelect={handleScenarioSelect}
          />
        )}

        {/* Step: form */}
        {hasScenarios && step === 'form' && selectedScenario && (
          <ScenarioForm
            scenario={selectedScenario}
            formValues={formValues}
            onChange={handleFieldChange}
          />
        )}

        {/* Step: loading — architecture flow animation + live log */}
        {step === 'loading' && (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Esecuzione del flusso architetturale in corso...
            </Typography>
            <ArchitectureFlow
              steps={flowSteps}
              color={agentColor}
              onComplete={handleAnimationComplete}
              onStepActivate={handleStepActivate}
            />

            {/* Live log panel */}
            <Box
              sx={{
                mt: 2,
                bgcolor: '#0d1117',
                borderRadius: 1,
                border: '1px solid #30363d',
                p: 1.5,
                height: 130,
                overflowY: 'auto',
                fontFamily: '"Fira Mono", "Consolas", "Courier New", monospace',
                fontSize: '0.72rem',
                lineHeight: 1.8,
              }}
              aria-label="Log di esecuzione"
            >
              {logLines.length === 0 ? (
                <Box component="span" sx={{ color: '#484f58' }}>
                  In attesa del primo step...
                </Box>
              ) : (
                logLines.map((entry, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                    <Box component="span" sx={{ color: '#484f58', flexShrink: 0 }}>
                      [{entry.time}]
                    </Box>
                    <Box component="span" sx={{ color: '#58a6ff' }}>
                      {entry.message}
                    </Box>
                  </Box>
                ))
              )}
              {/* Blinking cursor */}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 7,
                  height: '0.75em',
                  bgcolor: '#58a6ff',
                  ml: 0.5,
                  verticalAlign: 'text-bottom',
                  animation: `${logBlink} 1s step-start infinite`,
                }}
              />
              <div ref={logEndRef} />
            </Box>
          </Box>
        )}

        {/* Step: result */}
        {step === 'result' && <ResultPanel result={result} error={error} />}
      </DialogContent>

      <DialogActions>
        {(step === 'select' || !hasScenarios) && (
          <Button onClick={handleClose}>Annulla</Button>
        )}

        {step === 'form' && (
          <>
            <Button onClick={handleBack}>Indietro</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isFormValid(selectedScenario, formValues)}
            >
              Avvia
            </Button>
          </>
        )}

        {step === 'result' && (
          <Button onClick={handleClose} variant="contained">
            Chiudi
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
