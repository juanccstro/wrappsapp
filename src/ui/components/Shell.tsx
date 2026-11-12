import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Animated colour blobs behind everything. Decorative. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="wr-blob wr-blob-a -top-1/4 -left-1/4 h-[70%] w-[70%] bg-[var(--wr-a)]" />
      <div className="wr-blob wr-blob-b -right-1/4 top-1/4 h-[65%] w-[65%] bg-[var(--wr-c)]" />
      <div className="wr-blob wr-blob-c -bottom-1/4 left-1/4 h-[55%] w-[55%] bg-[var(--wr-d)]" />
      <div className="absolute inset-0 bg-[var(--wr-bg)]/55" />
    </div>
  );
}

/**
 * Mobile-first stage. On a phone it fills the screen; on larger screens the content sits in a
 * 9:16 phone frame, centred, with the animated backdrop around it. On phones with a notch or a
 * home indicator, the safe areas keep buttons and text clear of them.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden sm:p-6">
      <Backdrop />
      <div className="relative h-full w-full overflow-hidden bg-[var(--wr-bg)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:aspect-[9/16] sm:h-[min(100%,56rem)] sm:w-auto sm:rounded-[2.5rem] sm:border sm:border-white/15 sm:shadow-[0_30px_120px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-white text-[#12062b] hover:bg-white/90 shadow-[0_10px_40px_rgba(255,77,141,0.35)]',
  secondary: 'border border-white/40 text-white hover:bg-white/10',
  ghost: 'text-white/80 hover:text-white underline-offset-4 hover:underline',
};

export function Button({ variant = 'primary', className = '', type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
