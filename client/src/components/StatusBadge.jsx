import { titleCase } from '../utils/format.js';
import StatusIcon from './StatusIcon.jsx';

export default function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <StatusIcon status={status} />
      {titleCase(status)}
    </span>
  );
}
