import ApiIcon from '@mui/icons-material/Api';
import BoltIcon from '@mui/icons-material/Bolt';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmailIcon from '@mui/icons-material/Email';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HubIcon from '@mui/icons-material/Hub';
import RouterIcon from '@mui/icons-material/Router';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

const COMMON_START = [
  { id: 'dashboard',    label: 'Dashboard',    Icon: DashboardIcon },
  { id: 'proxy',        label: 'nginx Proxy',  Icon: RouterIcon },
  { id: 'backend',      label: 'FastAPI',       Icon: ApiIcon },
  { id: 'orchestrator', label: 'Orchestrator', Icon: HubIcon },
];

const COMMON_END = [
  { id: 'audit', label: 'Audit Log', Icon: FactCheckIcon },
];

export const FLOW_STEPS = {
  PASSWORD_RESET_REQUESTED: [
    ...COMMON_START,
    { id: 'agent', label: 'Credential\nRecovery', Icon: BoltIcon },
    { id: 'email', label: 'Email\nService',        Icon: EmailIcon },
    ...COMMON_END,
  ],
  CART_INACTIVE_24H: [
    ...COMMON_START,
    { id: 'agent', label: 'Cart\nAbandonment', Icon: ShoppingCartIcon },
    { id: 'email', label: 'Email + CRM',       Icon: CampaignIcon },
    ...COMMON_END,
  ],
};
