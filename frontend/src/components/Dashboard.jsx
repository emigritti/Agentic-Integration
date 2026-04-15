import { useState } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AgentCard from './AgentCard';
import ScenarioDialog from './ScenarioDialog';
import { agents } from '../constants/agents';

export default function Dashboard() {
  const [dialogState, setDialogState] = useState({ open: false, agent: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleRun = (agent) => {
    setDialogState({ open: true, agent });
  };

  const handleDialogClose = (result) => {
    setDialogState({ open: false, agent: null });
    if (result) {
      const message = result.error
        ? `Errore: ${result.error}`
        : result.outcome || 'Elaborazione completata';
      const severity = result.status === 'success' ? 'success' : result.error ? 'error' : 'info';
      setSnackbar({ open: true, message, severity });
    }
  };

  const handleSnackbarClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <SmartToyIcon sx={{ mr: 1.5, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Agentic Integration
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Commerce Agent Hub
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 1, color: 'primary.main' }}>
          Agenti Disponibili
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Seleziona un agente per avviarne l&apos;esecuzione.
        </Typography>

        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item key={agent.id} xs={12} sm={6} md={4} lg={3}>
              <AgentCard agent={agent} onRun={handleRun} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {dialogState.agent && (
        <ScenarioDialog
          open={dialogState.open}
          agent={dialogState.agent}
          onClose={handleDialogClose}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
