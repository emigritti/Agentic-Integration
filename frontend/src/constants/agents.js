import BoltIcon from '@mui/icons-material/Bolt';
import StorageIcon from '@mui/icons-material/Storage';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import SchoolIcon from '@mui/icons-material/School';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export const agents = [
  {
    id: 'simple-reflex',
    name: 'Simple Reflex Agents',
    description:
      'React directly to current percepts using condition-action rules. Fast and stateless.',
    Icon: BoltIcon,
    color: '#1565c0',
    scenarios: [
      {
        id: 'password-reset',
        label: 'Password Reset',
        description: 'Recupera le credenziali di accesso per un utente.',
        eventType: 'PASSWORD_RESET_REQUESTED',
        fields: [
          { name: 'user_id', label: 'ID Utente', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
        ],
      },
      {
        id: 'cart-abandonment',
        label: 'Carrello Abbandonato',
        description: 'Invia un reminder per un carrello rimasto inattivo.',
        eventType: 'CART_INACTIVE_24H',
        fields: [
          { name: 'customer_id', label: 'ID Cliente', type: 'text', required: true },
          { name: 'cart_id', label: 'ID Carrello', type: 'text', required: true },
          { name: 'cart_value', label: 'Valore Carrello (€)', type: 'number', required: true },
        ],
      },
    ],
  },
  {
    id: 'model-based-reflex',
    name: 'Model-Based Reflex Agents',
    description:
      'Maintain an internal model of the world to handle partially observable environments.',
    Icon: StorageIcon,
    color: '#2e7d32',
    scenarios: [],
  },
  {
    id: 'logical',
    name: 'Logical Agents',
    description:
      'Use formal logic and inference to reason about the world and derive conclusions.',
    Icon: PsychologyIcon,
    color: '#6a1b9a',
    scenarios: [],
  },
  {
    id: 'goal-based',
    name: 'Goal-Based Agents',
    description:
      'Search for action sequences that achieve defined goals, planning ahead as needed.',
    Icon: TrackChangesIcon,
    color: '#e65100',
    scenarios: [],
  },
  {
    id: 'utility-based',
    name: 'Utility-Based Agents',
    description:
      'Maximize expected utility by evaluating outcomes with a preference function.',
    Icon: EqualizerIcon,
    color: '#b71c1c',
    scenarios: [],
  },
  {
    id: 'learning',
    name: 'Learning Agents',
    description:
      'Improve performance over time through experience, feedback, and self-correction.',
    Icon: SchoolIcon,
    color: '#00695c',
    scenarios: [],
  },
  {
    id: 'hybrid-hierarchical',
    name: 'Hybrid-Hierarchical Agents',
    description:
      'Combine multiple architectures in layered hierarchies to tackle complex, multi-step tasks.',
    Icon: AccountTreeIcon,
    color: '#4527a0',
    scenarios: [],
  },
];
