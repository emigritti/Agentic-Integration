import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function AgentCard({ agent, onRun }) {
  const { name, description, Icon, color } = agent;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        borderTop: `4px solid ${color}`,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 8,
        },
      }}
    >
      <CardActionArea
        onClick={() => onRun(agent)}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        aria-label={`Esegui ${name}`}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
            <Avatar sx={{ bgcolor: color, width: 44, height: 44, flexShrink: 0 }}>
              <Icon sx={{ fontSize: 24 }} />
            </Avatar>
            <Typography variant="h6" component="h2" sx={{ fontSize: '0.95rem', lineHeight: 1.3 }}>
              {name}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {description}
          </Typography>
        </CardContent>

        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Chip
            icon={<PlayArrowIcon />}
            label="Esegui"
            size="small"
            sx={{
              bgcolor: `${color}18`,
              color: color,
              fontWeight: 600,
              '& .MuiChip-icon': { color: color },
            }}
          />
        </Box>
      </CardActionArea>
    </Card>
  );
}
