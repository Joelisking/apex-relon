import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between text-background p-10 relative"
        style={{
          backgroundColor: '#0d0d0d',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.12'/%3E%3C/svg%3E")`,
        }}>
        <div className="relative z-10">
          <Image
            src="/logo-black-transparent.svg"
            alt="Relon"
            width={32}
            height={32}
            className="h-8 invert"
          />
        </div>
        <div className="relative z-10 space-y-4">
          <blockquote className="text-lg font-display leading-relaxed text-background/90">
            &ldquo;Streamline your sales pipeline, manage clients, and
            make data-driven decisions — all in one place.&rdquo;
          </blockquote>
          <p className="text-sm text-background/50">
            AI-Enhanced Business Performance Dashboard
          </p>
        </div>
        <p className="relative z-10 text-xs text-background/40">
          &copy; {new Date().getFullYear()} Relon. All rights
          reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="lg:hidden text-center mb-8">
          <Image
            src="/logo-black-transparent.svg"
            alt="Relon"
            width={32}
            height={32}
            className="h-8 mx-auto"
          />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
