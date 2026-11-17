import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { BookingTicketData } from '@/types/bookings';

interface TicketGuidelinesCardProps {
  ticket: BookingTicketData;
}

export function TicketGuidelinesCard({ ticket }: TicketGuidelinesCardProps) {
  return (
    <div className="w-full max-w-[580px] mt-8 p-6 md:p-7 rounded-[28px] bg-surface-container-low/90 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4">
        <MaterialIcon name="info" className="text-primary text-[22px]" />
        <h2 className="font-headline-card text-headline-card text-on-surface font-semibold">
          {ticket.guidelinesTitle}
        </h2>
      </div>

      <ul className="space-y-3.5">
        {ticket.guidelines.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <MaterialIcon name={item.icon} className="text-[15px]" />
            </div>
            <p className="font-label-primary text-label-primary text-on-surface-variant">
              {item.textPrefix}
              {item.highlightText && (
                <strong className="text-on-surface font-semibold">{item.highlightText}</strong>
              )}
              {item.textSuffix}
            </p>
          </li>
        ))}
      </ul>

      {/* Direct Duty Officer Helpline Strip (phone link removed per privacy policy) */}
      <div className="mt-6 pt-5 border-t border-outline-variant/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <MaterialIcon name="support_agent" className="text-[18px]" />
          </div>
          <div>
            <div className="font-label-meta text-label-meta font-bold text-on-surface">
              {ticket.helplineTitle}
            </div>
            <div className="font-caption text-caption text-on-surface-variant">
              {ticket.helplineSubtitle}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary font-label-meta text-label-meta font-semibold shadow-sm">
          <MaterialIcon name="verified_user" className="text-[16px]" />
          <span>{ticket.helplineBadge}</span>
        </span>
      </div>
    </div>
  );
}
