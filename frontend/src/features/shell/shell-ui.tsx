"use client";

import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Waves } from "lucide-react";
import clsx from "clsx";

export type HeroMetric = {
  label: string;
  value: string;
  detail: string;
};

export type SurfaceCardProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export type DidacticItem = {
  title: string;
  detail: string;
};

export type CompactBar = {
  label: string;
  value: number;
  detail?: string;
  tone?: "default" | "accent" | "success";
};

export function FlowBackdrop() {
  return (
    <div aria-hidden="true" className="flow-visual">
      <div className="flow-visual-orb flow-visual-orb--one" />
      <div className="flow-visual-orb flow-visual-orb--two" />
      <svg className="flow-visual-svg" fill="none" viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flowStream" x1="24" x2="500" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15" />
            <stop offset="48%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="flowGlow" x1="24" x2="500" y1="0" y2="0">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M24 118C90 74 150 74 210 118C270 162 330 162 390 118C430 92 464 82 496 84" stroke="url(#flowStream)" strokeWidth="8" strokeLinecap="round" />
        <path d="M24 164C100 126 158 128 214 164C272 202 330 202 390 162C432 136 466 126 496 128" stroke="url(#flowStream)" strokeWidth="5" strokeLinecap="round" />
        <path d="M24 208C88 176 150 176 208 208C266 240 334 242 396 206C436 184 468 176 496 174" stroke="url(#flowStream)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="132" cy="118" r="14" fill="#0f172a" fillOpacity="0.16" />
        <circle cx="226" cy="162" r="10" fill="#0ea5e9" fillOpacity="0.28" />
        <circle cx="336" cy="206" r="12" fill="#22c55e" fillOpacity="0.26" />
        <circle cx="424" cy="118" r="16" fill="#f59e0b" fillOpacity="0.18" />
        <path d="M98 256H422" stroke={clsx("#0f172a")} strokeOpacity="0.1" strokeWidth="1" />
        <path d="M104 250H104V194" stroke={clsx("#0f172a")} strokeOpacity="0.08" strokeWidth="1" />
        <path d="M192 250H192V166" stroke={clsx("#0f172a")} strokeOpacity="0.08" strokeWidth="1" />
        <path d="M280 250H280V146" stroke={clsx("#0f172a")} strokeOpacity="0.08" strokeWidth="1" />
        <path d="M368 250H368V120" stroke={clsx("#0f172a")} strokeOpacity="0.08" strokeWidth="1" />
        <g fill="#0f172a" fillOpacity="0.7" fontSize="14" fontWeight="600">
          <text x="28" y="36">Reynolds</text>
          <text x="28" y="58" fillOpacity="0.45" fontSize="11" fontWeight="500">
            perfil de velocidade e regime
          </text>
        </g>
        <g fill="#0f172a" fillOpacity="0.56" fontSize="11" fontWeight="500">
          <text x="88" y="284">Laminar</text>
          <text x="182" y="284">Transição</text>
          <text x="304" y="284">Turbulento</text>
        </g>
        <rect x="76" y="72" width="68" height="34" rx="12" fill="url(#flowGlow)" />
        <rect x="178" y="58" width="76" height="34" rx="12" fill="url(#flowGlow)" />
        <rect x="290" y="52" width="84" height="34" rx="12" fill="url(#flowGlow)" />
      </svg>
      <div className="flow-visual-caption">
        <strong>Leitura didática</strong>
        <span>O mesmo painel visual funciona como guia para estudantes e apoio de sala para docentes.</span>
      </div>
    </div>
  );
}

export function HeroMetrics({ metrics }: { metrics: HeroMetric[] }) {
  return (
    <div className="metric-grid" role="list">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label} role="listitem">
          <div className="metric-value">{metric.value}</div>
          <div className="metric-label">{metric.label}</div>
          <div className="metric-detail">{metric.detail}</div>
        </article>
      ))}
    </div>
  );
}

export function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
  metrics,
  visual,
  note
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics: HeroMetric[];
  visual?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="dashboard-hero surface-card surface-card--hero">
      <div className="dashboard-hero-copy">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="dashboard-title">{title}</h1>
        <p className="dashboard-description">{description}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
        <HeroMetrics metrics={metrics} />
        {note ? <div className="dashboard-note">{note}</div> : null}
      </div>
      {visual ? <div className="dashboard-hero-visual">{visual}</div> : null}
    </section>
  );
}

export function SurfaceCard({
  eyebrow,
  title,
  description,
  action,
  className,
  children
}: SurfaceCardProps) {
  return (
    <section className={clsx("surface-card", className)}>
      {eyebrow || title || description || action ? (
        <div className="surface-card-header">
          <div>
            {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="surface-card-title">{title}</h2> : null}
            {description ? <p className="surface-card-description">{description}</p> : null}
          </div>
          {action ? <div className="surface-card-action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {action ? <div className="section-header-action">{action}</div> : null}
    </div>
  );
}

export function DidacticList({
  title,
  items
}: {
  title: string;
  items: readonly DidacticItem[];
}) {
  return (
    <div className="didactic-list">
      <div className="didactic-list-title">{title}</div>
      <div className="didactic-list-items">
        {items.map((item, index) => (
          <article className="didactic-item" key={item.title}>
            <div className="didactic-index">{index + 1}</div>
            <div>
              <div className="didactic-item-title">{item.title}</div>
              <div className="didactic-item-detail">{item.detail}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CompactBars({
  title,
  description,
  bars
}: {
  title: string;
  description?: string;
  bars: CompactBar[];
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <div className="compact-chart">
      <div className="compact-chart-header">
        <div className="compact-chart-title">{title}</div>
        {description ? <div className="compact-chart-description">{description}</div> : null}
      </div>
      <div className="compact-chart-bars">
        {bars.map((bar) => (
          <div className="compact-chart-row" key={bar.label}>
            <div className="compact-chart-row-label">{bar.label}</div>
            <div className="compact-chart-track">
              <div
                className={clsx("compact-chart-fill", {
                  "compact-chart-fill--accent": bar.tone === "accent",
                  "compact-chart-fill--success": bar.tone === "success"
                })}
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            </div>
            <div className="compact-chart-row-value">
              {bar.value}
              {bar.detail ? <span>{bar.detail}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionLink({
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className="action-link" {...props}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={16} />
    </a>
  );
}

export function ActionButton({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary";
}) {
  return (
    <button className={clsx("action-button", `action-button--${tone}`)} {...props}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={16} />
    </button>
  );
}

export function FlowSignal({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flow-signal">
      <Waves aria-hidden="true" size={16} />
      <div>
        <div className="flow-signal-label">{label}</div>
        <div className="flow-signal-value">{value}</div>
      </div>
    </div>
  );
}

export function SectionDivider() {
  return <div aria-hidden="true" className="section-divider" />;
}

export function TableFrame({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="table-frame">
      <div className="table-frame-header">
        <div>
          <div className="table-frame-title">{title}</div>
          {description ? <div className="table-frame-description">{description}</div> : null}
        </div>
        <BarChart3 aria-hidden="true" size={18} />
      </div>
      {children}
    </div>
  );
}
