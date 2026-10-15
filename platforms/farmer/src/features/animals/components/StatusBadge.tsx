import type { AnimalStatus } from '../animals.types';
import { STATUS_LABELS, STATUS_COLORS } from '../animals.types';

interface Props {
  status: AnimalStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props): JSX.Element {
  const color = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  const fontSize = size === 'sm' ? '0.6875rem' : '0.75rem';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.625rem',
      borderRadius: 20,
      fontSize,
      fontWeight: 600,
      backgroundColor: color.bg,
      color: color.text,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
