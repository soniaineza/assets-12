import React from 'react';
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}
export function Badge({
  children,
  variant = 'neutral',
  className = ''
}: BadgeProps) {
  const variants = {
    success: 'bg-ledger-green/10 text-ledger-green border-ledger-green/30',
    warning: 'bg-ledger-amber/10 text-ledger-amber border-ledger-amber/30',
    danger: 'bg-ledger-red/10 text-ledger-red border-ledger-red/30',
    info: 'bg-paper-dark text-ink border-rule',
    neutral: 'bg-paper-dark text-ink-soft border-rule'
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${variants[variant]} ${className}`}>
      
      {children}
    </span>);

}