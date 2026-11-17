import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { GateEntryStatus } from '@/types/gate';

interface GateEntryStatusBadgeProps {
  status: GateEntryStatus;
}

export function GateEntryStatusBadge({ status }: GateEntryStatusBadgeProps) {
  if (status === 'Granted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-primary text-label-primary font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        Granted
      </span>
    );
  }

  if (status === 'Override') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-label-primary text-label-primary font-bold">
        <MaterialIcon name="shield" className="text-[14px]" />
        Override
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 font-label-primary text-label-primary font-bold">
      <span className="w-2 h-2 rounded-full bg-red-600" />
      Rejected
    </span>
  );
}
