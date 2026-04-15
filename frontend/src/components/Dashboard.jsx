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
import { agents } from '../constants/agents';

export default function Dashboard() {
  const [snackbar, setSnackbar] = useState({ open: false, agentName: '' });

  const handleRun = (agent) => {
    setSnackbar({ open: true, agentName: agent.name });
  };

  const handleClose = (_event, reason) => {
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity="info" variant="filled" sx={{ width: '100%' }}>
          Agente &quot;{snackbar.agentName}&quot; in esecuzione...
        </Alert>
      </Snackbar>
    </Box>
  );
}
