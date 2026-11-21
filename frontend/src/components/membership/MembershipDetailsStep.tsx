import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { AuthUser, BackendGender } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import { membershipGenderOptions } from '@/data/mockData';
import type {
  MembershipOnboardingErrors,
  MembershipOnboardingFormData,
} from '@/types/membership';

interface MembershipDetailsStepProps {
  user: AuthUser | null;
  formData: MembershipOnboardingFormData;
  errors: MembershipOnboardingErrors;
  isTrackUnavailable: boolean;
  onUpdateField: <K extends keyof MembershipOnboardingFormData>(
    key: K,
    value: MembershipOnboardingFormData[K],
  ) => void;
  onContinue: () => void;
}

export function MembershipDetailsStep({
  user,
  formData,
  errors,
  isTrackUnavailable,
  onUpdateField,
  onContinue,
}: MembershipDetailsStepProps) {
  const { lang, t } = useLanguage();
  const isGovt = user?.role === 'GOVT_PERSONNEL';

  return (
    <section className="lg:col-span-8 w-full flex flex-col gap-5 membership-step-enter">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#165DF5]">
          {t('Step 1 of 3 • Member Onboarding', 'ഘട്ടം 1 / 3 • അംഗ വിവരങ്ങൾ')}
        </p>
        <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.1]">
          {t('Member Onboarding Details', 'അംഗത്വ വ്യക്തിഗത വിവരങ്ങൾ')}
        </h1>
        <p className="text-[14px] text-[#475569]">
          {t(
            'Provide your personal demographics, residential address, and track training purpose. Fields marked * are required and saved to your profile.',
            'നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങളും മേൽവിലാസവും ട്രാക്ക് ഉപയോഗ ലക്ഷ്യവും നൽകുക. * അടയാളപ്പെടുത്തിയവ നിർബന്ധമാണ്.',
          )}
        </p>
      </div>

      {/* Auto-Displayed Account Identity & Category Read-Only Strip */}
      {user ? (
        <div className="rounded-[22px] bg-white/95 border border-slate-200/85 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Member Account (From Sign-Up)', 'അംഗ അക്കൗണ്ട് (രജിസ്ട്രേഷൻ പ്രകാരം)')}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="font-display text-[17px] font-extrabold text-[#0F172A] truncate">
                  {user.full_name}
                </span>
                <span className="text-[12.5px] font-mono text-[#64748B]">@{user.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                isGovt
                  ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                  : 'bg-slate-100 border-slate-200 text-[#334155]'
              }`}
            >
              {isGovt ? <ShieldCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {isGovt
                ? t('Govt / Police Personnel', 'സർക്കാർ / പോലീസ്')
                : t('General Public', 'പൊതുജനം')}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] bg-blue-50/80 border border-blue-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#0F172A]">
              {t('Sign in to save your onboarding details', 'വിവരങ്ങൾ സേവ് ചെയ്യാൻ സൈൻ ഇൻ ചെയ്യുക')}
            </p>
            <p className="text-[13px] text-[#475569] mt-0.5">
              {t(
                'Your account name and category (General Public vs. Govt / Police) are auto-filled from your Kannur City Police Sports account.',
                'നിങ്ങളുടെ പേരും വിഭാഗവും അക്കൗണ്ടിൽ നിന്ന് സ്വയം പൂരിപ്പിക്കപ്പെടും.',
              )}
            </p>
          </div>
          <Link
            to="/login"
            state={{ from: '/membership' }}
            className="btn-primary !h-10 px-5 text-[13.5px] inline-flex items-center justify-center shrink-0"
          >
            {t('Sign in', 'സൈൻ ഇൻ')}
          </Link>
        </div>
      )}

      {/* Row 1: Side-by-Side Cards (Personal & Residential Address) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Personal Demographics */}
        <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <User className="w-4 h-4" />
            </span>
            <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
              {t('Personal Details', 'വ്യക്തിഗത വിവരങ്ങൾ')}
            </h2>
          </div>

          {/* Gender Segmented Control */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#1E293B]">
              {t('Gender', 'ലിംഗം')} <span className="text-[#DC2626]">*</span>
            </label>
            <div
              role="radiogroup"
              aria-label="Gender"
              className={`p-1 rounded-[14px] bg-slate-100/90 border flex items-center gap-1 ${
                errors.gender ? 'border-[#DC2626] ring-2 ring-red-100' : 'border-slate-200/90'
              }`}
            >
              {membershipGenderOptions.map((opt) => {
                const isSelected = formData.gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onUpdateField('gender', opt.value as BackendGender)}
                    className={`flex-1 h-10 rounded-[10px] text-[13px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#165DF5] text-white shadow-[0_4px_12px_-3px_rgba(22,93,245,0.5)]'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/70'
                    }`}
                  >
                    {lang === 'ML' ? opt.labelMl : opt.label}
                  </button>
                );
              })}
            </div>
            {errors.gender && (
              <span className="text-[12px] font-medium text-[#DC2626]">{errors.gender}</span>
            )}
          </div>

          {/* Date of Birth */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onboard-dob" className="text-[13px] font-semibold text-[#1E293B]">
              {t('Date of Birth', 'ജനനത്തീയതി')} <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
              <input
                id="onboard-dob"
                name="dateOfBirth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={formData.dateOfBirth}
                onChange={(e) => onUpdateField('dateOfBirth', e.target.value)}
                aria-invalid={Boolean(errors.dateOfBirth)}
                className={`membership-input pl-10 pr-3.5 ${
                  errors.dateOfBirth ? 'membership-input-error' : ''
                }`}
              />
            </div>
            {errors.dateOfBirth && (
              <span className="text-[12px] font-medium text-[#DC2626]">{errors.dateOfBirth}</span>
            )}
          </div>

          {/* Father's or Mother's Name (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onboard-parent" className="text-[13px] font-semibold text-[#1E293B]">
              {t("Father's or Mother's Name", 'പിതാവിന്റെ / മാതാവിന്റെ പേര്')}{' '}
              <span className="text-[11.5px] font-normal text-[#64748B]">
                ({t('Optional', 'ഓപ്ഷണൽ')})
              </span>
            </label>
            <input
              id="onboard-parent"
              name="parentName"
              type="text"
              value={formData.parentName}
              onChange={(e) => onUpdateField('parentName', e.target.value)}
              placeholder={t('e.g. Sreedharan Nair', 'ഉദാ. ശ്രീധരൻ നായർ')}
              className="membership-input px-3.5"
            />
          </div>
        </div>

        {/* Card 2: Residential Address */}
        <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </span>
              <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                {t('Residential Address', 'താമസ വിലാസം')}
              </h2>
            </div>

            {/* Present Address */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="onboard-present-address"
                className="text-[13px] font-semibold text-[#1E293B]"
              >
                {t('House / Street Address', 'വീട് / തെരുവ് വിലാസം')}{' '}
                <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                id="onboard-present-address"
                name="presentAddress"
                rows={2}
                value={formData.presentAddress}
                onChange={(e) => onUpdateField('presentAddress', e.target.value)}
                placeholder={t(
                  'House / Flat No., Building, Street Name',
                  'വീട്ട് / ഫ്ലാറ്റ് നമ്പർ, തെരുവിന്റെ പേര്',
                )}
                aria-invalid={Boolean(errors.presentAddress)}
                className={`membership-textarea p-3 leading-relaxed resize-none ${
                  errors.presentAddress ? 'membership-input-error' : ''
                }`}
              />
              {errors.presentAddress && (
                <span className="text-[12px] font-medium text-[#DC2626]">
                  {errors.presentAddress}
                </span>
              )}
            </div>

            {/* Locality / City + PIN Code */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 flex flex-col gap-1.5">
                <label
                  htmlFor="onboard-locality"
                  className="text-[13px] font-semibold text-[#1E293B]"
                >
                  {t('Locality / City', 'സ്ഥലം / നഗരം')} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="onboard-locality"
                  name="cityLocality"
                  type="text"
                  value={formData.cityLocality}
                  onChange={(e) => onUpdateField('cityLocality', e.target.value)}
                  placeholder={t('e.g. Thottada, Kannur', 'ഉദാ. തോട്ടട, കണ്ണൂർ')}
                  aria-invalid={Boolean(errors.cityLocality)}
                  className={`membership-input px-3.5 ${
                    errors.cityLocality ? 'membership-input-error' : ''
                  }`}
                />
                {errors.cityLocality && (
                  <span className="text-[12px] font-medium text-[#DC2626]">
                    {errors.cityLocality}
                  </span>
                )}
              </div>

              <div className="sm:col-span-5 flex flex-col gap-1.5">
                <label htmlFor="onboard-pin" className="text-[13px] font-semibold text-[#1E293B]">
                  {t('PIN Code', 'പിൻ കോഡ്')} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="onboard-pin"
                  name="pinCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.pinCode}
                  onChange={(e) =>
                    onUpdateField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="670007"
                  aria-invalid={Boolean(errors.pinCode)}
                  className={`membership-input px-3.5 font-mono ${
                    errors.pinCode ? 'membership-input-error' : ''
                  }`}
                />
                {errors.pinCode && (
                  <span className="text-[12px] font-medium text-[#DC2626]">{errors.pinCode}</span>
                )}
              </div>
            </div>

            {/* Conditional Permanent Address */}
            {!formData.sameAsPresent && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="onboard-permanent-address"
                  className="text-[13px] font-semibold text-[#1E293B]"
                >
                  {t('Permanent Address', 'സ്ഥിര വിലാസം')} <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  id="onboard-permanent-address"
                  name="permanentAddress"
                  rows={2}
                  value={formData.permanentAddress}
                  onChange={(e) => onUpdateField('permanentAddress', e.target.value)}
                  placeholder={t(
                    'Enter full permanent address with locality and PIN code',
                    'സ്ഥിര വിലാസം, സ്ഥലം, പിൻ കോഡ് എന്നിവ നൽകുക',
                  )}
                  aria-invalid={Boolean(errors.permanentAddress)}
                  className={`membership-textarea p-3 leading-relaxed resize-none ${
                    errors.permanentAddress ? 'membership-input-error' : ''
                  }`}
                />
                {errors.permanentAddress && (
                  <span className="text-[12px] font-medium text-[#DC2626]">
                    {errors.permanentAddress}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Same-as-present Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[#334155]">
              {t(
                'Permanent address is the same as present address',
                'സ്ഥിര വിലാസവും താമസ വിലാസവും ഒന്നുതന്നെയാണ്',
              )}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.sameAsPresent}
              onClick={() => onUpdateField('sameAsPresent', !formData.sameAsPresent)}
              className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors ${
                formData.sameAsPresent
                  ? 'bg-[#165DF5] justify-end'
                  : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Card: Department / Office Details (Govt/Police Accounts Only — No ID uploads or ID numbers) */}
      {isGovt && (
        <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-blue-200/80 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(22,93,245,0.12)] flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#165DF5] flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </span>
              <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                {t('Department / Office Details', 'വകുപ്പ് / ഓഫീസ് വിവരങ്ങൾ')}
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-[#0F50DC]">
              {t('Govt / Police Category', 'സർക്കാർ / പോലീസ് വിഭാഗം')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="onboard-designation"
                className="text-[13px] font-semibold text-[#1E293B]"
              >
                {t('Designation / Rank', 'തസ്തിക')} <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="onboard-designation"
                name="designation"
                type="text"
                value={formData.designation}
                onChange={(e) => onUpdateField('designation', e.target.value)}
                placeholder={t('e.g. Sub-Inspector of Police', 'ഉദാ. സബ് ഇൻസ്പെക്ടർ')}
                aria-invalid={Boolean(errors.designation)}
                className={`membership-input px-3.5 ${
                  errors.designation ? 'membership-input-error' : ''
                }`}
              />
              {errors.designation && (
                <span className="text-[12px] font-medium text-[#DC2626]">{errors.designation}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="onboard-office-address"
                className="text-[13px] font-semibold text-[#1E293B]"
              >
                {t('Office / Station Address', 'ഓഫീസ് / സ്റ്റേഷൻ വിലാസം')}{' '}
                <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="onboard-office-address"
                name="officeAddress"
                type="text"
                value={formData.officeAddress}
                onChange={(e) => onUpdateField('officeAddress', e.target.value)}
                placeholder={t(
                  'e.g. District Police Office, South Bazaar, Kannur',
                  'ഉദാ. ജില്ലാ പോലീസ് ഓഫീസ്, കണ്ണൂർ',
                )}
                aria-invalid={Boolean(errors.officeAddress)}
                className={`membership-input px-3.5 ${
                  errors.officeAddress ? 'membership-input-error' : ''
                }`}
              />
              {errors.officeAddress && (
                <span className="text-[12px] font-medium text-[#DC2626]">
                  {errors.officeAddress}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card 3: Track Use & Sportsperson Profile */}
      <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
            {t('Track Use & Athletic Profile', 'ട്രാക്ക് ഉപയോഗവും കായിക വിവരങ്ങളും')}
          </h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboard-purpose" className="text-[13px] font-semibold text-[#1E293B]">
            {t('Purpose of using the Synthetic Track', 'സിന്തറ്റിക് ട്രാക്ക് ഉപയോഗിക്കുന്നതിന്റെ ലക്ഷ്യം')}{' '}
            <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="onboard-purpose"
            name="trackPurpose"
            type="text"
            value={formData.trackPurpose}
            onChange={(e) => onUpdateField('trackPurpose', e.target.value)}
            placeholder={t(
              'e.g. Daily fitness conditioning, sprint drills, marathon preparation',
              'ഉദാ. ദിനസരി ഫിറ്റ്നസ് പരിശീലനം, മാരത്തൺ തയ്യാറെടുപ്പ്',
            )}
            aria-invalid={Boolean(errors.trackPurpose)}
            className={`membership-input px-3.5 ${
              errors.trackPurpose ? 'membership-input-error' : ''
            }`}
          />
          {errors.trackPurpose && (
            <span className="text-[12px] font-medium text-[#DC2626]">{errors.trackPurpose}</span>
          )}
        </div>

        {/* Registered Sportsperson Switch */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[13.5px] font-semibold text-[#1E293B]">
            {t('I am a registered sportsperson', 'ഞാൻ രജിസ്റ്റർ ചെയ്ത കായികതാരമാണ്')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={formData.isRegisteredSportsperson}
            onClick={() =>
              onUpdateField('isRegisteredSportsperson', !formData.isRegisteredSportsperson)
            }
            className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors ${
              formData.isRegisteredSportsperson
                ? 'bg-[#165DF5] justify-end'
                : 'bg-slate-300 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {formData.isRegisteredSportsperson && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="onboard-sport" className="text-[13px] font-semibold text-[#1E293B]">
                {t('Sport / Discipline', 'കായിക ഇനം')} <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="onboard-sport"
                name="sportDiscipline"
                type="text"
                value={formData.sportDiscipline}
                onChange={(e) => onUpdateField('sportDiscipline', e.target.value)}
                placeholder={t('e.g. Athletics, 400m Sprint', 'ഉദാ. അത്‌ലറ്റിക്സ്')}
                aria-invalid={Boolean(errors.sportDiscipline)}
                className={`membership-input px-3.5 ${
                  errors.sportDiscipline ? 'membership-input-error' : ''
                }`}
              />
              {errors.sportDiscipline && (
                <span className="text-[12px] font-medium text-[#DC2626]">
                  {errors.sportDiscipline}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="onboard-association"
                className="text-[13px] font-semibold text-[#1E293B]"
              >
                {t('Association or Event Details', 'അസോസിയേഷൻ / മത്സര വിവരങ്ങൾ')}{' '}
                <span className="text-[11.5px] font-normal text-[#64748B]">
                  ({t('Optional', 'ഓപ്ഷണൽ')})
                </span>
              </label>
              <input
                id="onboard-association"
                name="associationDetails"
                type="text"
                value={formData.associationDetails}
                onChange={(e) => onUpdateField('associationDetails', e.target.value)}
                placeholder={t(
                  'e.g. Kerala State Athletics Association',
                  'ഉദാ. കേരള സ്റ്റേറ്റ് അത്‌ലറ്റിക്സ് അസോസിയേഷൻ',
                )}
                className="membership-input px-3.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Link
          to="/"
          className="btn-glass !h-12 px-6 text-[14px] inline-flex items-center justify-center"
        >
          {t('Cancel', 'റദ്ദാക്കുക')}
        </Link>

        <button
          type="button"
          disabled={isTrackUnavailable}
          onClick={onContinue}
          className={`btn-primary !h-12 px-7 text-[14.5px] inline-flex items-center justify-center gap-2 ${
            isTrackUnavailable ? 'opacity-55 cursor-not-allowed' : ''
          }`}
        >
          <span>{t('Continue to Plan & Session', 'പ്ലാൻ തിരഞ്ഞെടുക്കാൻ തുടരുക')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
