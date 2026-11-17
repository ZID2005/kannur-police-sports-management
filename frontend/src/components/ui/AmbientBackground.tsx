/** Fixed, non-interactive blurred light orbs behind the glass surfaces (DESIGN.md → Canvas & Gradients). */
export function AmbientBackground({ variant = 'public' }: { variant?: 'public' | 'admin' }) {
  if (variant === 'admin') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-64 right-10 w-[400px] h-[250px] bg-secondary-container/30 rounded-full blur-[100px]" />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div className="absolute -top-[120px] -right-[120px] w-[580px] h-[580px] rounded-full bg-[#BFD9FF] opacity-60 blur-[130px]" />
      <div className="absolute top-[35%] -left-[140px] w-[520px] h-[520px] rounded-full bg-[#C9D8FF] opacity-50 blur-[130px]" />
      <div className="absolute -bottom-[100px] right-[10%] w-[540px] h-[540px] rounded-full bg-[#DCEBFF] opacity-70 blur-[140px]" />
    </div>
  );
}
