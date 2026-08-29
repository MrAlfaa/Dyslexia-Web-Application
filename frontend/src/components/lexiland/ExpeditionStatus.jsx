import {
  CircleCheckBig,
  Clock3,
  LockKeyhole,
  MapPin,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';

const statusIcons = {
  attention: TriangleAlert,
  available: Sparkles,
  completed: CircleCheckBig,
  current: MapPin,
  locked: LockKeyhole,
  processing: Clock3,
};

const statusLabels = {
  attention: 'Needs attention',
  available: 'Available',
  completed: 'Completed',
  current: 'Current',
  locked: 'Locked',
  processing: 'Processing',
};

const ExpeditionStatus = ({ state = 'available', children, className = '', ...statusProps }) => {
  const normalizedState = statusIcons[state] ? state : 'available';
  const Icon = statusIcons[normalizedState];

  return (
    <span
      className={['lex-expedition-status', className].filter(Boolean).join(' ')}
      data-state={normalizedState}
      {...statusProps}
    >
      <Icon aria-hidden="true" />
      <span>{children || statusLabels[normalizedState]}</span>
    </span>
  );
};

export default ExpeditionStatus;
