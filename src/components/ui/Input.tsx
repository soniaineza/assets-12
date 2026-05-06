import React, { forwardRef } from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
            {label}
          </label>
        }
        <div className="relative">
          {icon &&
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              {icon}
            </div>
          }
          <input
            ref={ref}
            className={`block w-full px-3 py-2 text-sm ${icon ? 'pl-10' : ''} ${error ? '!border-ledger-red' : ''} ${className}`}
            {...props} />
          
        </div>
        {error &&
        <p className="mt-1.5 text-xs text-ledger-red font-medium">{error}</p>
        }
      </div>);

  }
);
Input.displayName = 'Input';