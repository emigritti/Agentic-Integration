import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const INITIAL_STATE = {
  step: 'select', // 'select' | 'form' | 'loading' | 'result'
  selectedScenario: null,
  formValues: {},
  result: null,
  error: null,
};

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
              <ListItem key={action} disableGutters sx={{ py: 0 }}>
                <Chip
                  label={action}
                  size="small"
                  variant="outlined"
                  color={severity}
                  sx={{ mt: 0.5 }}
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

export default function ScenarioDialog({ open, agent, onClose }) {
  const [state, setState] = useState(INITIAL_STATE);

  if (!agent) return null;

  const { step, selectedScenario, formValues, result, error } = state;
  const hasScenarios = agent.scenarios && agent.scenarios.length > 0;

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
    setState(INITIAL_STATE);
  };

  const handleSubmit = async () => {
    setState((s) => ({ ...s, step: 'loading', error: null }));

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
        setState((s) => ({
          ...s,
          step: 'result',
          result: {
            ...data,
            status: 'skipped',
            outcome: data.outcome || 'Evento già elaborato in precedenza',
          },
        }));
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore HTTP ${res.status}`);
      }

      const data = await res.json();
      setState((s) => ({ ...s, step: 'result', result: data }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'result',
        result: null,
        error: err.message || 'Errore di connessione al backend',
      }));
    }
  };

  const dialogTitle = () => {
    if (!hasScenarios) return agent.name;
    if (step === 'select') return `Seleziona scenario — ${agent.name}`;
    if (step === 'form') return selectedScenario?.label ?? '';
    if (step === 'loading') return 'Elaborazione in corso...';
    if (step === 'result') return result?.status === 'success' ? 'Eseguito con successo' : 'Elaborazione completata';
    return agent.name;
  };

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
        {!hasScenarios && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Nessuno scenario configurato per questo agente.
          </Typography>
        )}

        {hasScenarios && step === 'select' && (
          <ScenarioSelector
            scenarios={agent.scenarios}
            selectedId={selectedScenario?.id}
            onSelect={handleScenarioSelect}
          />
        )}

        {hasScenarios && step === 'form' && selectedScenario && (
          <ScenarioForm
            scenario={selectedScenario}
            formValues={formValues}
            onChange={handleFieldChange}
          />
        )}

        {step === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

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
