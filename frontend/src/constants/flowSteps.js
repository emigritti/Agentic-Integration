import ApiIcon from '@mui/icons-material/Api';
import BoltIcon from '@mui/icons-material/Bolt';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmailIcon from '@mui/icons-material/Email';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HubIcon from '@mui/icons-material/Hub';
import RouterIcon from '@mui/icons-material/Router';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

// Each step has:
//   label       — short name shown in the node header
//   description — what this component does and why (shown below the icon)
//   log         — message appended to the live log panel when the step activates

const COMMON_START = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    Icon: DashboardIcon,
    description: "Raccoglie l'evento\ndall'utente e costruisce\nil payload JSON",
    log: '▶  Evento ricevuto dalla dashboard',
  },
  {
    id: 'proxy',
    label: 'nginx Proxy',
    Icon: RouterIcon,
    description: 'Instrada la richiesta\nHTTP verso il backend\nsu porta 8000',
    log: '→  Proxy: inoltro a backend:8000',
  },
  {
    id: 'backend',
    label: 'FastAPI',
    Icon: ApiIcon,
    description: 'Valida il payload\ncon Pydantic v2\ne verifica idempotenza',
    log: '✓  FastAPI: payload validato (Pydantic v2)',
  },
  {
    id: 'orchestrator',
    label: 'Orchestrator',
    Icon: HubIcon,
    description: 'Smista l\'evento\nall\'agente corretto\ntramite registry',
    log: '⚙  Orchestrator: routing evento → agente',
  },
];

const COMMON_END = [
  {
    id: 'audit',
    label: 'Audit Log',
    Icon: FactCheckIcon,
    description: 'Registra l\'esecuzione\nper tracciabilità\ne conformità',
    log: '📋 Audit: esecuzione registrata nel log',
  },
];

export const FLOW_STEPS = {
  PASSWORD_RESET_REQUESTED: [
    ...COMMON_START,
    {
      id: 'agent',
      label: 'Credential\nRecovery',
      Icon: BoltIcon,
      description: 'Verifica utente,\ncontrolla cooldown\ne genera token sicuro',
      log: '🔑 Agent: utente verificato, token generato',
    },
    {
      id: 'email',
      label: 'Email\nService',
      Icon: EmailIcon,
      description: 'Invia il link\ndi ripristino\nall\'indirizzo registrato',
      log: '📧 Email: link di ripristino inviato',
    },
    ...COMMON_END,
  ],
  CART_INACTIVE_24H: [
    ...COMMON_START,
    {
      id: 'agent',
      label: 'Cart\nAbandonment',
      Icon: ShoppingCartIcon,
      description: 'Verifica consenso\nmarketing e cooldown\nprima del reminder',
      log: '🛒 Agent: consenso OK, reminder approvato',
    },
    {
      id: 'email',
      label: 'Email + CRM',
      Icon: CampaignIcon,
      description: 'Invia reminder\nal cliente e aggiorna\nil profilo CRM',
      log: '📧 Email + CRM: reminder inviato, CRM aggiornato',
    },
    ...COMMON_END,
  ],
};
