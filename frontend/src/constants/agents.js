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
  },
  {
    id: 'model-based-reflex',
    name: 'Model-Based Reflex Agents',
    description:
      'Maintain an internal model of the world to handle partially observable environments.',
    Icon: StorageIcon,
    color: '#2e7d32',
  },
  {
    id: 'logical',
    name: 'Logical Agents',
    description:
      'Use formal logic and inference to reason about the world and derive conclusions.',
    Icon: PsychologyIcon,
    color: '#6a1b9a',
  },
  {
    id: 'goal-based',
    name: 'Goal-Based Agents',
    description:
      'Search for action sequences that achieve defined goals, planning ahead as needed.',
    Icon: TrackChangesIcon,
    color: '#e65100',
  },
  {
    id: 'utility-based',
    name: 'Utility-Based Agents',
    description:
      'Maximize expected utility by evaluating outcomes with a preference function.',
    Icon: EqualizerIcon,
    color: '#b71c1c',
  },
  {
    id: 'learning',
    name: 'Learning Agents',
    description:
      'Improve performance over time through experience, feedback, and self-correction.',
    Icon: SchoolIcon,
    color: '#00695c',
  },
  {
    id: 'hybrid-hierarchical',
    name: 'Hybrid-Hierarchical Agents',
    description:
      'Combine multiple architectures in layered hierarchies to tackle complex, multi-step tasks.',
    Icon: AccountTreeIcon,
    color: '#4527a0',
  },
];
