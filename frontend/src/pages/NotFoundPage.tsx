import { Link } from 'react-router-dom';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <AmbientBackground />
      <div className="glass-card relative z-10 rounded-[32px] p-10 max-w-[480px] w-full text-center">
        <p className="text-[13px] font-medium text-[#6B7280]">Error 404</p>
        <h1 className="text-[30px] md:text-[40px] font-bold tracking-[-0.03em] text-[#111418] mt-1">Page not found</h1>
        <p className="text-[17px] text-[#6B7280] mt-3">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn-primary mt-8 w-full inline-flex items-center justify-center">
          Back to home
        </Link>
      </div>
    </div>
  );
}
