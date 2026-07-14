'use client';

/* Small shared form controls for Motion Studio */

import { ReactNode, useState } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ms-field">
      <label className="ms-label">{label}</label>
      {children}
    </div>
  );
}

export function TextInput({
  value, onChange, placeholder, mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      className={`ms-input ${mono ? 'ms-input-mono' : ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className="ms-input"
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Seg<T extends string>({
  options, value, onChange, small,
}: {
  options: readonly { id: T; label: string }[] | { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className="ms-seg">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`ms-seg-btn ${value === o.id ? 'is-active' : ''} ${small ? 'is-small' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value, onChange, min, max, step, format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="ms-slider-row">
      <input
        type="range"
        className="ms-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ms-slider-val">{format ? format(value) : value}</span>
    </div>
  );
}

export function Section({ title, children, badge, defaultOpen = false }: {
  title: string; children: ReactNode; badge?: string;
  /** Start expanded (the scene and export sections do; the rest fold away). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ms-section">
      <div
        className="ms-section-head is-toggle"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
      >
        <h3 className="ms-section-title">
          <span className="ms-section-chev" aria-hidden>{open ? '▾' : '▸'}</span>
          {title}
        </h3>
        {badge && <span className="ms-section-badge">{badge}</span>}
      </div>
      {open && children}
    </section>
  );
}
