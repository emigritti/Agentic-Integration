import { useEffect, useRef, useState } from 'react';
import { keyframes } from '@mui/system';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// In test mode (Vitest) use 0ms delay so tests don't time out
const STEP_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 1000;
const INITIAL_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 300;

const activePulse = keyframes`
  0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(0,0,0,0.12); }
  50%  { transform: scale(1.07); box-shadow: 0 0 8px 4px rgba(0,0,0,0.08); }
  100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(0,0,0,0); }
`;

function FlowNode({ step, nodeState, color }) {
  const isLit = nodeState === 'active' || nodeState === 'done';
  const isAnimating = nodeState === 'active';

  return (
    <Paper
      elevation={isLit ? 3 : 0}
      sx={{
        width: 78,
        minHeight: 68,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        p: 0.75,
        border: 2,
        borderColor: isLit ? color : 'grey.300',
        bgcolor: isLit ? `${color}18` : 'grey.50',
        transition: 'border-color 0.35s ease, background-color 0.35s ease, box-shadow 0.35s ease',
        animation: isAnimating ? `${activePulse} 0.65s ease-out` : 'none',
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      <step.Icon
        sx={{
          fontSize: 22,
          color: isLit ? color : 'grey.400',
          transition: 'color 0.35s ease',
        }}
      />
      <Typography
        component="div"
        align="center"
        sx={{
          fontSize: '0.58rem',
          lineHeight: 1.25,
          fontWeight: isLit ? 700 : 400,
          color: isLit ? 'text.primary' : 'text.disabled',
          transition: 'color 0.35s ease, font-weight 0.35s ease',
          whiteSpace: 'pre-line',
        }}
      >
        {step.label}
      </Typography>
    </Paper>
  );
}

/**
 * Animated architecture flow diagram.
 * Each node lights up sequentially with STEP_DELAY_MS between steps.
 * Calls onComplete() after the last step activates.
 */
export default function ArchitectureFlow({ steps, color, onComplete }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const onCompleteRef = useRef(onComplete);

  // Keep ref current without re-running the effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!steps || steps.length === 0) {
      onCompleteRef.current?.();
      return;
    }

    const timers = steps.map((_, i) =>
      setTimeout(() => setActiveIndex(i), INITIAL_DELAY_MS + i * STEP_DELAY_MS)
    );

    const finalTimer = setTimeout(
      () => onCompleteRef.current?.(),
      INITIAL_DELAY_MS + steps.length * STEP_DELAY_MS
    );

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!steps || steps.length === 0) return null;

  return (
    <Box
      data-testid="architecture-flow"
      sx={{
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        py: 1,
        gap: 0.5,
      }}
    >
      {steps.map((step, i) => {
        const nodeState =
          i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'inactive';

        return (
          <Box
            key={step.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}
          >
            <FlowNode step={step} nodeState={nodeState} color={color} />
            {i < steps.length - 1 && (
              <ArrowForwardIcon
                sx={{
                  fontSize: 16,
                  color: i < activeIndex ? color : 'grey.300',
                  transition: 'color 0.35s ease',
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
