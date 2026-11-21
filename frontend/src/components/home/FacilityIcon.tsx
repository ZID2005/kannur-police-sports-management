import type { HomeFacilityIconName } from '@/types/home';

interface FacilityIconProps {
  name: HomeFacilityIconName;
  className?: string;
}

/**
 * Clean sports icons for Kannur City Police facility cards:
 * - track: Oval athletics running track with inner lane
 * - football: Classic football / soccer ball
 * - turf: 7-a-side turf pitch markings
 * - badminton: Shuttlecock silhouette
 */
export function FacilityIcon({ name, className = 'w-5 h-5 md:w-[22px] md:h-[22px]' }: FacilityIconProps) {
  switch (name) {
    case 'track':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="6" width="19" height="12" rx="6" />
          <rect x="6" y="9.2" width="12" height="5.6" rx="2.8" />
          <path d="M9.5 6v3.2" />
          <path d="M14.5 14.8V18" />
        </svg>
      );
    case 'football':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9.5" />
          <polygon points="12 7.5 16 10.4 14.5 15 9.5 15 8 10.4" />
          <path d="M12 2.5v5" />
          <path d="M21 9.2l-5 1.2" />
          <path d="M17.8 19.5l-3.3-4.5" />
          <path d="M6.2 19.5l3.3-4.5" />
          <path d="M3 9.2l5 1.2" />
        </svg>
      );
    case 'turf':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <line x1="12" y1="4.5" x2="12" y2="19.5" />
          <circle cx="12" cy="12" r="2.75" />
          <path d="M2.5 9h3v6h-3" />
          <path d="M21.5 9h-3v6h3" />
        </svg>
      );
    case 'badminton':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17a3 3 0 1 0 4.24 4.24L13 19.5 8.76 15.26 7 17Z" />
          <path d="M9.5 14.5 13 4.5l4 1.5-2.5 8.5" />
          <path d="M11.5 16.5 19.5 11l-1.5-4-6.5 6.5" />
          <path d="M12.5 8.5l5.5 2.5" />
        </svg>
      );
  }
}

export function ArrowUpRightIcon({ className = 'w-4 h-4 md:w-5 md:h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
