import React, { forwardRef } from 'react';
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: {
    label: string;
    value: string;
  }[];
  placeholder?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
            {label}
          </label>
        }
        <select
          ref={ref}
          className={`block w-full px-3 py-2 text-sm ${error ? '!border-ledger-red' : ''} ${className}`}
          {...props}>
          
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((opt) =>
          <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )}
        </select>
        {error &&
        <p className="mt-1.5 text-xs text-ledger-red font-medium">{error}</p>
        }
      </div>);

  }
);
Select.displayName = 'Select';