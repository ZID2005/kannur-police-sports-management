import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Edit3,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  ReceiptText,
  Save,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react';
import {
  ApiError,
  bookingsApi,
  membershipsApi,
  type ApiMembership,
  type ApiSlotBooking,
  type BackendGender,
} from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { membershipGenderOptions } from '@/data/mockData';
import '@/styles/membership.css';

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Not provided';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: iso.length === 10 ? 'UTC' : undefined,
  });
}

function formatGenderLabel(gender: BackendGender | null | undefined, lang: 'EN' | 'ML'): string {
  if (!gender) return lang === 'ML' ? 'നൽകിയിട്ടില്ല' : 'Not provided';
  const found = membershipGenderOptions.find((g) => g.value === gender);
  if (!found) return gender;
  return lang === 'ML' ? found.labelMl : found.label;
}

interface ProfileEditFormState {
  full_name: string;
  email: string;
  gender: BackendGender | '';
  date_of_birth: string;
  parent_name: string;
  present_address: string;
  city_locality: string;
  pin_code: string;
  sameAsPresent: boolean;
  permanent_address: string;
  designation: string;
  office_address: string;
  track_purpose: string;
  is_registered_sportsperson: boolean;
  sport_discipline: string;
  association_details: string;
}

/**
 * Member Profile & Account screen (`/account`).
 * Displays and allows editing of saved Gender, Residential Address, and onboarding details,
 * alongside active pass status and booking activity — with zero government ID / mobile / SMS OTP data.
 */
export default function AccountPage() {
  const { user, loading: authLoading, logout, updateProfile } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<ApiSlotBooking[]>([]);
  const [memberships, setMemberships] = useState<ApiMembership[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({
    full_name: '',
    email: '',
    gender: '',
    date_of_birth: '',
    parent_name: '',
    present_address: '',
    city_locality: '',
    pin_code: '',
    sameAsPresent: true,
    permanent_address: '',
    designation: '',
    office_address: '',
    track_purpose: '',
    is_registered_sportsperson: false,
    sport_discipline: '',
    association_details: '',
  });

  useEffect(() => {
    if (!user) return;
    const present = user.present_address ?? '';
    const locality = user.city_locality ?? '';
    const pin = user.pin_code ?? '';
    const combinedPresent = [present, locality, pin].filter(Boolean).join(', ');
    const permanent = user.permanent_address ?? '';
    const isSame =
      !permanent ||
      permanent.trim() === present.trim() ||
      permanent.trim() === combinedPresent.trim();

    setEditForm({
      full_name: user.full_name ?? '',
      email: user.email ?? '',
      gender: (user.gender as BackendGender | null) ?? '',
      date_of_birth: user.date_of_birth ?? '',
      parent_name: user.parent_name ?? '',
      present_address: present,
      city_locality: locality,
      pin_code: pin,
      sameAsPresent: isSame,
      permanent_address: isSame ? '' : permanent,
      designation: user.designation ?? '',
      office_address: user.office_address ?? '',
      track_purpose: user.track_purpose ?? '',
      is_registered_sportsperson: Boolean(user.is_registered_sportsperson),
      sport_discipline: user.sport_discipline ?? '',
      association_details: user.association_details ?? '',
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      bookingsApi.getMy().catch(() => ({ bookings: [] as ApiSlotBooking[] })),
      membershipsApi.getMy().catch(() => ({ memberships: [] as ApiMembership[] })),
    ]).then(([bRes, mRes]) => {
      if (!active) return;
      setBookings(bRes.bookings);
      setMemberships(mRes.memberships);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    const totalHours = confirmed.reduce((sum, b) => {
      const [sh, sm] = b.start_time_formatted.split(':').map(Number);
      const [eh, em] = b.end_time_formatted.split(':').map(Number);
      return sum + Math.max(1, (eh * 60 + em - (sh * 60 + sm)) / 60);
    }, 0);
    const activePass = memberships.find((m) => m.status === 'ACTIVE') ?? null;
    return {
      confirmedCount: confirmed.length,
      totalHours: Math.round(totalHours),
      activePass,
    };
  }, [bookings, memberships]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || saving) return;

    if (editForm.pin_code.trim() && !/^\d{6}$/.test(editForm.pin_code.trim())) {
      setSaveError(
        t('PIN code must be a valid 6-digit Indian PIN code.', 'സാധുവായ 6 അക്ക പിൻ കോഡ് നൽകുക.'),
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const combinedPresent = [
      editForm.present_address.trim(),
      editForm.city_locality.trim(),
      editForm.pin_code.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    try {
      await updateProfile({
        full_name: editForm.full_name.trim() || user.full_name,
        email: editForm.email.trim() || null,
        gender: (editForm.gender || null) as BackendGender | null,
        date_of_birth: editForm.date_of_birth.trim() || null,
        parent_name: editForm.parent_name.trim() || null,
        present_address: editForm.present_address.trim() || null,
        city_locality: editForm.city_locality.trim() || null,
        pin_code: editForm.pin_code.trim() || null,
        permanent_address: editForm.sameAsPresent
          ? combinedPresent || null
          : editForm.permanent_address.trim() || null,
        designation: user.role === 'GOVT_PERSONNEL' ? editForm.designation.trim() || null : null,
        office_address:
          user.role === 'GOVT_PERSONNEL' ? editForm.office_address.trim() || null : null,
        track_purpose: editForm.track_purpose.trim() || null,
        is_registered_sportsperson: editForm.is_registered_sportsperson,
        sport_discipline: editForm.is_registered_sportsperson
          ? editForm.sport_discipline.trim() || null
          : null,
        association_details: editForm.is_registered_sportsperson
          ? editForm.association_details.trim() || null
          : null,
      });

      setIsEditing(false);
      setSaveSuccess(
        t(
          'Your personal & address onboarding details have been saved.',
          'നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങളും വിലാസവും വിജയകരമായി സേവ് ചെയ്തു.',
        ),
      );
      window.setTimeout(() => setSaveSuccess(null), 4000);
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'Unable to save profile details right now. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-14 flex items-center justify-center">
        <div className="max-w-md w-full rounded-[28px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-8 text-center shadow-[0_18px_44px_-18px_rgba(15,23,42,0.12)] flex flex-col items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <UserCircle2 className="w-6 h-6" />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#0F172A]">
              {t('Member Account', 'അംഗ അക്കൗണ്ട്')}
            </h1>
            <p className="text-[13.5px] text-[#64748B] mt-1.5">
              {t(
                'Sign in or create an account to view and manage your profile, saved address details, and booking activity.',
                'നിങ്ങളുടെ പ്രൊഫൈലും ബുക്കിംഗ് വിവരങ്ങളും കാണാൻ സൈൻ ഇൻ ചെയ്യുക.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <Link to="/login" className="btn-primary !h-11 px-6 text-[14px] inline-flex items-center">
              {t('Sign in', 'സൈൻ ഇൻ')}
            </Link>
            <Link to="/register" className="btn-glass !h-11 px-5 text-[14px] inline-flex items-center">
              {t('Create account', 'അക്കൗണ്ട് തുടങ്ങുക')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isGovt = user.role === 'GOVT_PERSONNEL';
  const formattedPresentAddress = [user.present_address, user.city_locality, user.pin_code]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="w-full max-w-[1040px] mx-auto px-4 md:px-6 pt-5 md:pt-8 pb-16 flex flex-col gap-6 text-[#0F172A]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#165DF5]">
            {t('Member Portal Profile', 'അംഗ പോർട്ടൽ പ്രൊഫൈൽ')}
          </p>
          <h1 className="font-display text-[30px] sm:text-[36px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-tight mt-0.5">
            {t('Account & Profile', 'അക്കൗണ്ടും പ്രൊഫൈലും')}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="h-10 px-4 rounded-full bg-white/85 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 text-[13.5px] font-semibold inline-flex items-center gap-2 self-start sm:self-auto transition"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('Sign out', 'ലോഗ് ഔട്ട്')}</span>
        </button>
      </header>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div
          role="status"
          className="rounded-[18px] bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3 text-[13.5px] font-semibold text-emerald-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Identity & Tariff Tier Card */}
      <section className="rounded-[26px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-6 sm:p-7 shadow-[0_18px_44px_-18px_rgba(15,23,42,0.12)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#165DF5] to-[#0F49C7] text-white font-display text-[22px] font-extrabold flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(22,93,245,0.5)]">
            {getInitials(user.full_name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[22px] sm:text-[24px] font-extrabold text-[#0F172A] leading-tight">
                {user.full_name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11.5px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('Active Account', 'സജീവ അക്കൗണ്ട്')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-[#64748B] mt-1">
              <span className="font-mono text-[#334155]">@{user.username}</span>
              {user.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
              )}
              {user.created_at && (
                <span>
                  {t('Joined', 'ചേർന്ന തീയതി:')} {formatDate(user.created_at)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-bold ${
                  isGovt
                    ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                    : 'bg-slate-100 border-slate-200 text-[#334155]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isGovt ? t('Govt / Police', 'സർക്കാർ / പോലീസ്') : t('General Public', 'പൊതുജനം')}
              </span>
              {user.gender && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[12px] font-bold">
                  {formatGenderLabel(user.gender, lang)}
                </span>
              )}
              <span className="text-[12.5px] text-[#475569]">
                {isGovt
                  ? t(
                      'Eligible for subsidized Govt / Police facility concession rates.',
                      'സർക്കാർ / പോലീസ് ഇളവ് നിരക്കുകൾക്ക് അർഹതയുണ്ട്.',
                    )
                  : t(
                      'Standard General Public facility tariffs apply.',
                      'സാധാരണ പൊതുജന കായിക നിരക്കുകൾ ബാധകമാണ്.',
                    )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Demographics & Residential Address Onboarding Details */}
      <section className="rounded-[26px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-6 sm:p-7 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-display text-[19px] font-bold text-[#0F172A]">
                {t('Personal & Address Onboarding Details', 'വ്യക്തിഗത വിവരങ്ങളും വിലാസവും')}
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                {t(
                  'Saved details automatically pre-fill your Synthetic Track membership onboarding.',
                  'സേവ് ചെയ്ത വിവരങ്ങൾ സിന്തറ്റിക് ട്രാക്ക് അംഗത്വ അപേക്ഷയിൽ സ്വയം പൂരിപ്പിക്കപ്പെടും.',
                )}
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setIsEditing(true);
              }}
              className="btn-glass !h-10 px-4 text-[13.5px] inline-flex items-center gap-1.5 font-semibold text-[#165DF5]"
            >
              <Edit3 className="w-4 h-4" />
              <span>{t('Edit Details', 'വിവരങ്ങൾ തിരുത്തുക')}</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
            {saveError && (
              <div
                role="alert"
                className="rounded-[14px] bg-rose-50 border border-rose-200 px-4 py-3 flex items-start gap-2.5 text-[13px] font-medium text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-fullname" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Full Name', 'പൂർണ്ണനാമം')}
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="membership-input px-3.5"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-email" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Email Address', 'ഇമെയിൽ വിലാസം')}
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@example.org"
                  className="membership-input px-3.5"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Gender', 'ലിംഗം')}
                </label>
                <div
                  role="radiogroup"
                  aria-label="Gender"
                  className="p-1 rounded-[14px] bg-slate-100/90 border border-slate-200/90 flex items-center gap-1"
                >
                  {membershipGenderOptions.map((opt) => {
                    const isSelected = editForm.gender === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setEditForm((p) => ({ ...p, gender: opt.value }))}
                        className={`flex-1 h-10 rounded-[10px] text-[13px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#165DF5] text-white shadow-sm'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/70'
                        }`}
                      >
                        {lang === 'ML' ? opt.labelMl : opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-dob" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Date of Birth', 'ജനനത്തീയതി')}
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                  <input
                    id="profile-dob"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                    className="membership-input pl-10 pr-3.5"
                  />
                </div>
              </div>

              {/* Father's or Mother's Name */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label htmlFor="profile-parent" className="text-[13px] font-semibold text-[#1E293B]">
                  {t("Father's or Mother's Name", 'പിതാവിന്റെ / മാതാവിന്റെ പേര്')}
                </label>
                <input
                  id="profile-parent"
                  type="text"
                  value={editForm.parent_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, parent_name: e.target.value }))}
                  placeholder={t('Optional', 'ഓപ്ഷണൽ')}
                  className="membership-input px-3.5"
                />
              </div>

              {/* Present Address */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label htmlFor="profile-present-address" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Present Residential Address', 'താമസ വിലാസം')}
                </label>
                <textarea
                  id="profile-present-address"
                  rows={2}
                  value={editForm.present_address}
                  onChange={(e) => setEditForm((p) => ({ ...p, present_address: e.target.value }))}
                  placeholder={t('House / Flat No., Building, Street', 'വീട്ട് / ഫ്ലാറ്റ് നമ്പർ, തെരുവ്')}
                  className="membership-textarea p-3 resize-none"
                />
              </div>

              {/* Locality / City */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-locality" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Locality / City', 'സ്ഥലം / നഗരം')}
                </label>
                <input
                  id="profile-locality"
                  type="text"
                  value={editForm.city_locality}
                  onChange={(e) => setEditForm((p) => ({ ...p, city_locality: e.target.value }))}
                  placeholder="e.g. Pallikunnu, Kannur"
                  className="membership-input px-3.5"
                />
              </div>

              {/* PIN Code */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-pin" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('PIN Code', 'പിൻ കോഡ്')}
                </label>
                <input
                  id="profile-pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={editForm.pin_code}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      pin_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="670004"
                  className="membership-input px-3.5 font-mono"
                />
              </div>

              {/* Same as Present Toggle */}
              <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-[14px] bg-slate-50 border border-slate-200/75 px-4 py-3">
                <span className="text-[13px] font-medium text-[#334155]">
                  {t(
                    'Permanent address is the same as present address',
                    'സ്ഥിര വിലാസവും താമസ വിലാസവും ഒന്നുതന്നെയാണ്',
                  )}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.sameAsPresent}
                  onClick={() =>
                    setEditForm((p) => ({ ...p, sameAsPresent: !p.sameAsPresent }))
                  }
                  className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors ${
                    editForm.sameAsPresent
                      ? 'bg-[#165DF5] justify-end'
                      : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {!editForm.sameAsPresent && (
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label
                    htmlFor="profile-permanent-address"
                    className="text-[13px] font-semibold text-[#1E293B]"
                  >
                    {t('Permanent Address', 'സ്ഥിര വിലാസം')}
                  </label>
                  <textarea
                    id="profile-permanent-address"
                    rows={2}
                    value={editForm.permanent_address}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, permanent_address: e.target.value }))
                    }
                    placeholder={t('Enter full permanent address', 'സ്ഥിര വിലാസം നൽകുക')}
                    className="membership-textarea p-3 resize-none"
                  />
                </div>
              )}

              {/* Department Fields for Govt / Police */}
              {isGovt && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-designation"
                      className="text-[13px] font-semibold text-[#1E293B]"
                    >
                      {t('Designation / Rank', 'തസ്തിക')}
                    </label>
                    <input
                      id="profile-designation"
                      type="text"
                      value={editForm.designation}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, designation: e.target.value }))
                      }
                      placeholder="e.g. Sub-Inspector of Police"
                      className="membership-input px-3.5"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-office-address"
                      className="text-[13px] font-semibold text-[#1E293B]"
                    >
                      {t('Office / Station Address', 'ഓഫീസ് വിലാസം')}
                    </label>
                    <input
                      id="profile-office-address"
                      type="text"
                      value={editForm.office_address}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, office_address: e.target.value }))
                      }
                      placeholder="e.g. District Police Office, South Bazaar, Kannur"
                      className="membership-input px-3.5"
                    />
                  </div>
                </>
              )}

              {/* Track Purpose */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label htmlFor="profile-purpose" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('Synthetic Track Training Purpose', 'ട്രാക്ക് ഉപയോഗ ലക്ഷ്യം')}
                </label>
                <input
                  id="profile-purpose"
                  type="text"
                  value={editForm.track_purpose}
                  onChange={(e) => setEditForm((p) => ({ ...p, track_purpose: e.target.value }))}
                  placeholder={t(
                    'e.g. Daily fitness conditioning, marathon preparation',
                    'ഉദാ. ദിനസരി ഫിറ്റ്നസ് പരിശീലനം',
                  )}
                  className="membership-input px-3.5"
                />
              </div>

              {/* Registered Sportsperson Switch */}
              <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-[14px] bg-slate-50 border border-slate-200/75 px-4 py-3">
                <span className="text-[13px] font-medium text-[#334155]">
                  {t('Registered Sportsperson', 'രജിസ്റ്റർ ചെയ്ത കായികതാരം')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.is_registered_sportsperson}
                  onClick={() =>
                    setEditForm((p) => ({
                      ...p,
                      is_registered_sportsperson: !p.is_registered_sportsperson,
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors ${
                    editForm.is_registered_sportsperson
                      ? 'bg-[#165DF5] justify-end'
                      : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {editForm.is_registered_sportsperson && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-sport"
                      className="text-[13px] font-semibold text-[#1E293B]"
                    >
                      {t('Sport / Discipline', 'കായിക ഇനം')}
                    </label>
                    <input
                      id="profile-sport"
                      type="text"
                      value={editForm.sport_discipline}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, sport_discipline: e.target.value }))
                      }
                      placeholder="e.g. Athletics"
                      className="membership-input px-3.5"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-association"
                      className="text-[13px] font-semibold text-[#1E293B]"
                    >
                      {t('Association / Event Details', 'അസോസിയേഷൻ വിവരങ്ങൾ')}
                    </label>
                    <input
                      id="profile-association"
                      type="text"
                      value={editForm.association_details}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, association_details: e.target.value }))
                      }
                      placeholder="e.g. Kannur District Athletics Association"
                      className="membership-input px-3.5"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                }}
                className="btn-glass !h-11 px-5 text-[13.5px]"
              >
                {t('Cancel', 'റദ്ദാക്കുക')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary !h-11 px-6 text-[13.5px] inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('Saving...', 'സേവ് ചെയ്യുന്നു...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('Save Changes', 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13.5px]">
            <div className="rounded-[16px] bg-slate-50/85 border border-slate-200/75 p-4 flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Demographics', 'വ്യക്തിഗത വിവരങ്ങൾ')}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11.5px] text-[#64748B]">{t('Gender', 'ലിംഗം')}</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block">
                    {formatGenderLabel(user.gender, lang)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11.5px] text-[#64748B]">
                    {t('Date of Birth', 'ജനനത്തീയതി')}
                  </span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block">
                    {user.date_of_birth ? formatDate(user.date_of_birth) : t('Not provided', 'നൽകിയിട്ടില്ല')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[11.5px] text-[#64748B]">
                    {t("Father's or Mother's Name", 'പിതാവിന്റെ / മാതാവിന്റെ പേര്')}
                  </span>
                  <span className="font-medium text-[#0F172A] mt-0.5 block">
                    {user.parent_name || t('Not provided', 'നൽകിയിട്ടില്ല')}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] bg-slate-50/85 border border-slate-200/75 p-4 flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Residential Address', 'താമസ വിലാസം')}
              </span>
              <div>
                <span className="block text-[11.5px] text-[#64748B]">
                  {t('Present Address', 'നിലവിലെ വിലാസം')}
                </span>
                <span className="font-medium text-[#0F172A] mt-0.5 block leading-relaxed">
                  {formattedPresentAddress || t('Not provided yet', 'ഇതുവരെ നൽകിയിട്ടില്ല')}
                </span>
              </div>
              <div>
                <span className="block text-[11.5px] text-[#64748B]">
                  {t('Permanent Address', 'സ്ഥിര വിലാസം')}
                </span>
                <span className="font-medium text-[#0F172A] mt-0.5 block leading-relaxed">
                  {user.permanent_address ||
                    formattedPresentAddress ||
                    t('Not provided yet', 'ഇതുവരെ നൽകിയിട്ടില്ല')}
                </span>
              </div>
            </div>

            {isGovt && (
              <div className="rounded-[16px] bg-blue-50/60 border border-blue-200/75 p-4 flex flex-col gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#0F50DC]">
                  <Building2 className="w-3.5 h-3.5" />
                  {t('Department / Office Details', 'വകുപ്പ് / ഓഫീസ് വിവരങ്ങൾ')}
                </span>
                <p className="font-semibold text-[#0F172A]">
                  {user.designation || t('Designation not provided', 'തസ്തിക നൽകിയിട്ടില്ല')}
                </p>
                <p className="text-[#475569] leading-relaxed">
                  {user.office_address || t('Office address not provided', 'ഓഫീസ് വിലാസം നൽകിയിട്ടില്ല')}
                </p>
              </div>
            )}

            <div
              className={`rounded-[16px] bg-slate-50/85 border border-slate-200/75 p-4 flex flex-col gap-2 ${
                isGovt ? '' : 'md:col-span-2'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                <Sparkles className="w-3.5 h-3.5 text-[#165DF5]" />
                {t('Track Profile', 'ട്രാക്ക് പ്രൊഫൈൽ')}
              </span>
              <p className="font-medium text-[#0F172A]">
                {user.track_purpose || t('No track training purpose saved yet.', 'ട്രാക്ക് ഉപയോഗ ലക്ഷ്യം നൽകിയിട്ടില്ല.')}
              </p>
              <p className="text-[12.5px] text-[#475569]">
                <strong>{t('Registered Sportsperson:', 'രജിസ്റ്റർ ചെയ്ത കായികതാരം:')}</strong>{' '}
                {user.is_registered_sportsperson
                  ? `${t('Yes', 'അതെ')}${user.sport_discipline ? ` — ${user.sport_discipline}` : ''}${
                      user.association_details ? ` (${user.association_details})` : ''
                    }`
                  : t('No', 'ഇല്ല')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Activity Snapshot */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[22px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-5 shadow-sm">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
            {t('Confirmed Bookings', 'സ്ഥിരീകരിച്ച ബുക്കിംഗുകൾ')}
          </p>
          <p className="font-display text-[30px] font-extrabold text-[#0F172A] tabular-nums mt-1">
            {stats.confirmedCount}
          </p>
        </div>

        <div className="rounded-[22px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-5 shadow-sm">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
            {t('Hours Booked', 'ബുക്ക് ചെയ്ത മണിക്കൂറുകൾ')}
          </p>
          <p className="font-display text-[30px] font-extrabold text-[#165DF5] tabular-nums mt-1">
            {stats.totalHours}h
          </p>
        </div>

        <div className="rounded-[22px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-5 shadow-sm">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
            {t('Synthetic Track Membership', 'സിന്തറ്റിക് ട്രാക്ക് അംഗത്വം')}
          </p>
          <p className="font-display text-[19px] font-extrabold text-emerald-700 mt-2">
            {stats.activePass ? `${stats.activePass.pass_code}` : t('Not Enrolled', 'അംഗത്വമില്ല')}
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/bookings"
          className="group rounded-[22px] bg-white/85 hover:bg-white border border-slate-200/85 p-5 shadow-sm transition hover:-translate-y-0.5 flex flex-col justify-between gap-4"
        >
          <span className="w-10 h-10 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <CalendarPlus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-[17px] font-bold text-[#0F172A] flex items-center justify-between">
              <span>{t('Book a Facility Slot', 'സ്ലോട്ട് ബുക്ക് ചെയ്യുക')}</span>
              <ArrowRight className="w-4 h-4 text-[#165DF5] group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              {t('Browse live courts & instant confirmation', 'തത്സമയ കോർട്ടുകൾ ബുക്ക് ചെയ്യുക')}
            </p>
          </div>
        </Link>

        <Link
          to="/my-bookings"
          className="group rounded-[22px] bg-white/85 hover:bg-white border border-slate-200/85 p-5 shadow-sm transition hover:-translate-y-0.5 flex flex-col justify-between gap-4"
        >
          <span className="w-10 h-10 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-[17px] font-bold text-[#0F172A] flex items-center justify-between">
              <span>{t('My Bookings & Receipts', 'എന്റെ ബുക്കിംഗുകളും രസീതുകളും')}</span>
              <ArrowRight className="w-4 h-4 text-[#165DF5] group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              {t('Print GST fee receipts or manage slots', 'GST രസീതുകൾ പ്രിന്റ് ചെയ്യുക')}
            </p>
          </div>
        </Link>

        <Link
          to={stats.activePass ? '/membership/pass' : '/membership'}
          className="group rounded-[22px] bg-white/85 hover:bg-white border border-slate-200/85 p-5 shadow-sm transition hover:-translate-y-0.5 flex flex-col justify-between gap-4"
        >
          <span className="w-10 h-10 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-[17px] font-bold text-[#0F172A] flex items-center justify-between">
              <span>
                {stats.activePass
                  ? t('View Track Receipt', 'ട്രാക്ക് രസീത് കാണുക')
                  : t('Synthetic Track Pass', 'സിന്തറ്റിക് ട്രാക്ക് അംഗത്വം')}
              </span>
              <ArrowRight className="w-4 h-4 text-[#165DF5] group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              {t('Monthly 400m athletic track access', 'പ്രതിമാസ 400m ട്രാക്ക് അംഗത്വം')}
            </p>
          </div>
        </Link>
      </section>

      {/* Privacy Notice */}
      <section className="rounded-[20px] bg-slate-50/90 border border-slate-200/85 px-5 py-4 flex items-start gap-3 text-[13px] text-[#475569]">
        <Lock className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t(
            'Privacy & Minimal Data Policy: Your Kannur City Police Sports Portal account uses username and password sign-in only and stores only your display name, account category, onboarding demographics/address, and official GST fee receipts — zero mobile OTP or government ID numbers are ever collected.',
            'സ്വകാര്യതാ നയം: ഈ പോർട്ടൽ ഉപയോക്തൃനാമവും പാസ്‌വേഡും മാത്രമാണ് ഉപയോഗിക്കുന്നത്. മൊബൈൽ OTP-യോ സർക്കാർ തിരിച്ചറിയൽ നമ്പറുകളോ ശേഖരിക്കുന്നില്ല.',
          )}
        </p>
      </section>
    </div>
  );
}
