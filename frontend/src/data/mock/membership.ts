import type {
  MembershipDurationOption,
  MembershipGenderOption,
  MembershipSessionOption,
  MembershipStepDefinition,
} from '@/types/membership';

export const membershipOnboardingSteps: MembershipStepDefinition[] = [
  {
    step: 1,
    label: 'Member Details',
    labelMl: 'അംഗ വിവരങ്ങൾ',
    subtitle: 'Gender, address & track profile',
    subtitleMl: 'ലിംഗം, വിലാസം & ട്രാക്ക് വിവരങ്ങൾ',
  },
  {
    step: 2,
    label: 'Plan & Track Session',
    labelMl: 'പ്ലാനും സെഷനും',
    subtitle: 'Duration & daily training window',
    subtitleMl: 'കാലാവധിയും പരിശീലന സമയവും',
  },
  {
    step: 3,
    label: 'Review & Activate',
    labelMl: 'പരിശോധിച്ച് സജീവമാക്കുക',
    subtitle: 'Instant GST checkout & receipt',
    subtitleMl: 'ഉടൻ GST പണമടയ്ക്കലും രസീതും',
  },
];

export const membershipGenderOptions: MembershipGenderOption[] = [
  { value: 'MALE', label: 'Male', labelMl: 'പുരുഷൻ' },
  { value: 'FEMALE', label: 'Female', labelMl: 'സ്ത്രീ' },
  { value: 'TRANSGENDER', label: 'Transgender', labelMl: 'ട്രാൻസ്‌ജെൻഡർ' },
];

export const membershipDurationOptions: MembershipDurationOption[] = [
  {
    months: 1,
    label: '1 Month',
    labelMl: '1 മാസം',
    daysLabel: '30 Days',
  },
  {
    months: 2,
    label: '2 Months',
    labelMl: '2 മാസം',
    daysLabel: '60 Days',
  },
  {
    months: 3,
    label: '3 Months',
    labelMl: '3 മാസം',
    daysLabel: '90 Days',
    recommended: true,
  },
  {
    months: 6,
    label: '6 Months',
    labelMl: '6 മാസം',
    daysLabel: '180 Days',
  },
];

export const membershipSessionOptions: MembershipSessionOption[] = [
  {
    id: 'MORNING',
    label: 'Morning Session',
    labelMl: 'പ്രഭാത സെഷൻ',
    hoursLabel: '05:00 AM – 10:00 AM',
  },
  {
    id: 'EVENING',
    label: 'Evening Session',
    labelMl: 'വൈകുന്നേര സെഷൻ',
    hoursLabel: '03:00 PM – 09:00 PM',
  },
  {
    id: 'BOTH',
    label: 'All-Day Access',
    labelMl: 'രാവിലെയും വൈകുന്നേരവും',
    hoursLabel: '05:00 AM – 09:00 PM',
  },
];
