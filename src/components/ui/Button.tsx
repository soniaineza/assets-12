import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
  'inline-flex items-center justify-center font-medium tracking-wide transition-all border focus:outline-none disabled:opacity-50 disabled:pointer-events-none uppercase text-xs';
  const variants = {
    primary:
    'bg-ledger-green text-paper-light border-ledger-green hover:bg-ledger-green-soft hover:border-ledger-green-soft',
    secondary:
    'bg-paper-light text-ink border-rule hover:border-ink hover:bg-paper-dark',
    danger: 'bg-ledger-red text-paper-light border-ledger-red hover:bg-red-900',
    ghost:
    'bg-transparent text-ink-soft border-transparent hover:text-ink hover:border-rule'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm'
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}>
      
      {isLoading &&
      <svg
        className="animate-spin -ml-1 mr-2 h-3 w-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24">
        
          <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4">
        </circle>
          <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
        </path>
        </svg>
      }
      {children}
    </button>);

}