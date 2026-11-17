import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { membershipGenders } from '@/data/mockData';
import type {
  MembershipFormData,
  MembershipGender,
  MembershipValidationErrors,
} from '@/types/membership';

interface MembershipDetailsStepProps {
  formData: MembershipFormData;
  errors: MembershipValidationErrors;
  onUpdateField: <K extends keyof MembershipFormData>(
    key: K,
    value: MembershipFormData[K],
  ) => void;
  onClearFieldsForTest: () => void;
  onRestoreSampleData: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function MembershipDetailsStep({
  formData,
  errors,
  onUpdateField,
  onClearFieldsForTest,
  onRestoreSampleData,
  onBack,
  onContinue,
}: MembershipDetailsStepProps) {
  const isGovernment = formData.category === 'government';

  return (
    <section className="lg:col-span-8 w-full flex flex-col gap-6 md:gap-8">
      {/* Header Group */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-title-portal text-[28px] md:text-title-portal font-bold text-on-surface tracking-tight leading-tight">
            Your details
          </h1>
          <p className="font-body-default text-[15px] md:text-body-default text-secondary">
            Fields marked <span className="text-error">*</span> are required.
          </p>
        </div>

        {/* Helper pills to quickly preview filled vs empty/error states */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRestoreSampleData}
            className="px-3 py-1.5 rounded-full bg-surface-container-lowest/70 hover:bg-surface-container-lowest text-primary font-label-meta text-label-meta font-semibold shadow-sm transition-colors"
          >
            Fill sample
          </button>
          <button
            type="button"
            onClick={onClearFieldsForTest}
            className="px-3 py-1.5 rounded-full bg-surface-container-lowest/70 hover:bg-surface-container-lowest text-secondary hover:text-error font-label-meta text-label-meta font-medium shadow-sm transition-colors"
          >
            Clear fields
          </button>
        </div>
      </div>

      {/* Row 1: Side-by-side Glass Cards (Personal & Address) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Personal Details */}
        <div className="bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(31,111,255,0.07),inset_0_1px_0_0_rgba(255,255,255,0.85)] rounded-[28px] md:rounded-[36px] p-5 md:p-8 flex flex-col gap-5 md:gap-6">
          <h3 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
            Personal
          </h3>

          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label
              className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
              htmlFor="fullName"
            >
              Full name <span className="text-error">*</span>
            </label>
            <div className="flex flex-col gap-1.5 w-full">
              <div className="relative flex items-center">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => onUpdateField('fullName', e.target.value)}
                  placeholder="Enter full name"
                  aria-invalid={Boolean(errors.fullName)}
                  className={`w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all ${
                    errors.fullName ? 'membership-input-error' : ''
                  }`}
                />
              </div>
              {errors.fullName && (
                <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                  {errors.fullName}
                </span>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="flex flex-col gap-2">
            <label
              className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
              htmlFor="dob"
            >
              Date of birth <span className="text-error">*</span>
            </label>
            <div className="flex flex-col gap-1.5 w-full">
              <div className="relative flex items-center">
                <input
                  id="dob"
                  name="dob"
                  type="text"
                  value={formData.dob}
                  onChange={(e) => onUpdateField('dob', e.target.value)}
                  placeholder="DD / MM / YYYY"
                  aria-invalid={Boolean(errors.dob)}
                  className={`w-full h-14 pl-5 pr-12 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all ${
                    errors.dob ? 'membership-input-error' : ''
                  }`}
                />
                <MaterialIcon
                  name="calendar_today"
                  className="absolute right-4 text-secondary/70 pointer-events-none text-[20px] md:text-[22px]"
                />
              </div>
              {errors.dob && (
                <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                  {errors.dob}
                </span>
              )}
            </div>
          </div>

          {/* Gender Segmented Control */}
          <div className="flex flex-col gap-2">
            <label className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface">
              Gender <span className="text-error">*</span>
            </label>
            <div className="h-12 md:h-14 p-1 md:p-1.5 rounded-[16px] md:rounded-[20px] bg-white/40 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] flex items-center gap-1 md:gap-1.5">
              {membershipGenders.map((g: MembershipGender) => {
                const isSelected = formData.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onUpdateField('gender', g)}
                    className={
                      isSelected
                        ? 'flex-1 h-full rounded-[12px] md:rounded-[16px] bg-[#1F6FFF]/15 text-[#0053CD] font-label-primary text-[13px] md:text-label-primary font-semibold flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(31,111,255,0.12)]'
                        : 'flex-1 h-full rounded-[12px] md:rounded-[16px] text-secondary hover:text-on-surface font-label-primary text-[13px] md:text-label-primary font-medium flex items-center justify-center transition-all'
                    }
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Father's or Mother's Name (Optional) */}
          <div className="flex flex-col gap-2">
            <label
              className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
              htmlFor="parentName"
            >
              Father&apos;s or mother&apos;s name
            </label>
            <div className="relative flex items-center">
              <input
                id="parentName"
                name="parentName"
                type="text"
                value={formData.parentName}
                onChange={(e) => onUpdateField('parentName', e.target.value)}
                placeholder="Optional"
                className="w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Address Details */}
        <div className="bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(31,111,255,0.07),inset_0_1px_0_0_rgba(255,255,255,0.85)] rounded-[28px] md:rounded-[36px] p-5 md:p-8 flex flex-col justify-between gap-5 md:gap-6">
          <div className="flex flex-col gap-5 md:gap-6">
            <h3 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
              Address
            </h3>

            {/* Present Address (3-line) */}
            <div className="flex flex-col gap-2">
              <label
                className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                htmlFor="presentAddress"
              >
                Present address <span className="text-error">*</span>
              </label>
              <textarea
                id="presentAddress"
                name="presentAddress"
                rows={3}
                value={formData.presentAddress}
                onChange={(e) => onUpdateField('presentAddress', e.target.value)}
                placeholder="Enter house/flat, street, area, pincode"
                aria-invalid={Boolean(errors.presentAddress)}
                className={`w-full p-3.5 md:p-4 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] resize-none transition-all leading-relaxed ${
                  errors.presentAddress ? 'membership-input-error' : ''
                }`}
              />
              {errors.presentAddress && (
                <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                  {errors.presentAddress}
                </span>
              )}
            </div>

            {/* Conditional Permanent Address if toggle is OFF */}
            {!formData.sameAsPresent && (
              <div className="flex flex-col gap-2">
                <label
                  className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                  htmlFor="permanentAddress"
                >
                  Permanent address <span className="text-error">*</span>
                </label>
                <textarea
                  id="permanentAddress"
                  name="permanentAddress"
                  rows={2}
                  value={formData.permanentAddress}
                  onChange={(e) => onUpdateField('permanentAddress', e.target.value)}
                  placeholder="Enter permanent house/flat, street, area, pincode"
                  aria-invalid={Boolean(errors.permanentAddress)}
                  className={`w-full p-3.5 md:p-4 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] resize-none transition-all leading-relaxed ${
                    errors.permanentAddress ? 'membership-input-error' : ''
                  }`}
                />
                {errors.permanentAddress && (
                  <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                    {errors.permanentAddress}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Toggle Switch: Permanent address matches present */}
          <div className="pt-2 md:pt-4 flex items-center justify-between gap-4">
            <span className="font-label-primary text-[13px] md:text-label-primary text-on-surface leading-tight">
              Permanent address is the same as present address
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.sameAsPresent}
              onClick={() => onUpdateField('sameAsPresent', !formData.sameAsPresent)}
              className={
                formData.sameAsPresent
                  ? 'w-12 h-7 rounded-full bg-[#1F6FFF] p-1 flex items-center justify-end shrink-0 transition-colors shadow-[0_2px_8px_rgba(31,111,255,0.25)] focus:outline-none'
                  : 'w-12 h-7 rounded-full bg-surface-container-highest p-1 flex items-center justify-start shrink-0 transition-colors shadow-inner focus:outline-none'
              }
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Card: Employment (when Government Personnel is selected) */}
      {isGovernment && (
        <div className="bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(31,111,255,0.07),inset_0_1px_0_0_rgba(255,255,255,0.85)] rounded-[28px] md:rounded-[36px] p-5 md:p-8 flex flex-col gap-5 md:gap-6">
          <h3 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
            Employment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Designation */}
            <div className="flex flex-col gap-2">
              <label
                className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                htmlFor="designation"
              >
                Designation <span className="text-error">*</span>
              </label>
              <div className="flex flex-col gap-1.5">
                <input
                  id="designation"
                  name="designation"
                  type="text"
                  value={formData.designation}
                  onChange={(e) => onUpdateField('designation', e.target.value)}
                  placeholder="Enter designation"
                  aria-invalid={Boolean(errors.designation)}
                  className={`w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all ${
                    errors.designation ? 'membership-input-error' : ''
                  }`}
                />
                {errors.designation && (
                  <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                    {errors.designation}
                  </span>
                )}
              </div>
            </div>

            {/* Field 2: Office address */}
            <div className="flex flex-col gap-2">
              <label
                className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                htmlFor="officeAddress"
              >
                Office address <span className="text-error">*</span>
              </label>
              <div className="flex flex-col gap-1.5">
                <textarea
                  id="officeAddress"
                  name="officeAddress"
                  rows={2}
                  value={formData.officeAddress}
                  onChange={(e) => onUpdateField('officeAddress', e.target.value)}
                  placeholder="Enter office address"
                  aria-invalid={Boolean(errors.officeAddress)}
                  className={`w-full p-4 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] resize-none transition-all leading-relaxed min-h-[56px] h-auto ${
                    errors.officeAddress ? 'membership-input-error' : ''
                  }`}
                />
                {errors.officeAddress && (
                  <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                    {errors.officeAddress}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Width Glass Card: Track Use */}
      <div className="bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(31,111,255,0.07),inset_0_1px_0_0_rgba(255,255,255,0.85)] rounded-[28px] md:rounded-[36px] p-5 md:p-8 flex flex-col gap-5 md:gap-6">
        <h3 className="font-headline-card text-[18px] md:text-headline-card font-semibold text-on-surface">
          Track use
        </h3>

        {/* Purpose of using the Synthetic Track */}
        <div className="flex flex-col gap-2">
          <label
            className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
            htmlFor="purpose"
          >
            Purpose of using the Synthetic Track <span className="text-error">*</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <input
              id="purpose"
              name="purpose"
              type="text"
              value={formData.purpose}
              onChange={(e) => onUpdateField('purpose', e.target.value)}
              placeholder="e.g., Daily fitness conditioning, athletic trials preparation, sprint training"
              aria-invalid={Boolean(errors.purpose)}
              className={`w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all ${
                errors.purpose ? 'membership-input-error' : ''
              }`}
            />
            {errors.purpose && (
              <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                {errors.purpose}
              </span>
            )}
          </div>
        </div>

        {/* Switch Row: Registered Sportsperson */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="font-label-primary text-[13px] md:text-label-primary text-on-surface leading-tight">
            I am a registered sportsperson
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={formData.isSportsperson}
            onClick={() => onUpdateField('isSportsperson', !formData.isSportsperson)}
            className={
              formData.isSportsperson
                ? 'w-12 h-7 rounded-full bg-[#1F6FFF] p-1 flex items-center justify-end shrink-0 transition-colors shadow-[0_2px_8px_rgba(31,111,255,0.25)] focus:outline-none'
                : 'w-12 h-7 rounded-full bg-surface-container-highest p-1 flex items-center justify-start shrink-0 transition-colors shadow-inner focus:outline-none'
            }
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform" />
          </button>
        </div>

        {/* Conditional Sportsperson Fields (from kannur_city_police_membership_step_2_sportsperson_active) */}
        {formData.isSportsperson && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex flex-col gap-2">
              <label
                className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                htmlFor="sportField"
              >
                Sport <span className="text-error">*</span>
              </label>
              <div className="flex flex-col gap-1.5">
                <input
                  id="sportField"
                  name="sportField"
                  type="text"
                  value={formData.sportField}
                  onChange={(e) => onUpdateField('sportField', e.target.value)}
                  placeholder="e.g., Athletics"
                  aria-invalid={Boolean(errors.sportField)}
                  className={`w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all ${
                    errors.sportField ? 'membership-input-error' : ''
                  }`}
                />
                {errors.sportField && (
                  <span className="font-label-meta text-[13px] leading-[18px] font-medium text-[#E5484D]">
                    {errors.sportField}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="font-label-primary text-[14px] md:text-label-primary font-medium text-on-surface"
                htmlFor="associationDetails"
              >
                Association or event details
              </label>
              <div className="relative flex items-center">
                <input
                  id="associationDetails"
                  name="associationDetails"
                  type="text"
                  value={formData.associationDetails}
                  onChange={(e) => onUpdateField('associationDetails', e.target.value)}
                  placeholder="e.g., Kerala State Athletics Association"
                  className="w-full h-14 px-5 rounded-[16px] md:rounded-[20px] bg-white/50 backdrop-blur-[20px] shadow-[inset_0_1px_2px_rgba(17,20,24,0.03)] font-body-default text-[15px] md:text-body-default text-on-surface placeholder:text-secondary/50 focus:outline-none focus:bg-white/85 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.15)] transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3 md:gap-4 pt-2 md:pt-4">
        <button
          type="button"
          onClick={onBack}
          className="h-14 px-8 rounded-[20px] md:rounded-[22px] bg-surface-container-lowest/60 backdrop-blur-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.90)] font-label-primary text-[15px] md:text-label-primary font-semibold text-[#1F6FFF] hover:bg-surface-container-lowest/90 hover:-translate-y-0.5 active:scale-[0.985] transition-all flex items-center justify-center"
        >
          Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="h-14 px-10 rounded-[20px] md:rounded-[22px] bg-[#1F6FFF] text-white font-label-primary text-[15px] md:text-label-primary font-semibold shadow-[0_8px_24px_rgba(31,111,255,0.28)] select-none transition-all hover:-translate-y-0.5 active:scale-[0.985] flex items-center justify-center"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
