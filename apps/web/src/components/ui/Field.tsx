import type { InputHTMLAttributes } from 'react';
import './Field.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export function Field({ label, error, id, ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={`field__input${error ? ' field__input--invalid' : ''}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
