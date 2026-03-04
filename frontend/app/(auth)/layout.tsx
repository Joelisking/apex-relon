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
        className="hidden lg:flex flex-col justify-between text-background p-10 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/auth.webp')" }}>
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/70" />
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
