"use client";

import type { ReactNode } from "react";
import { ArrowRight, Gauge, GraduationCap, Waves } from "lucide-react";

export function ReynoldsScene({
  title = "Campo de Reynolds",
  subtitle = "Camadas ordenadas, transição e regime turbulento em uma leitura rápida."
}: {
  title?: string;
  subtitle?: string;
}) {
  const bands = [
    { label: "Laminar", value: 28, tone: "is-laminar" },
    { label: "Transição", value: 54, tone: "is-transition" },
    { label: "Turbulento", value: 84, tone: "is-turbulent" }
  ] as const;

  return (
    <section aria-label={title} className="reynolds-scene">
      <div className="reynolds-scene__header">
        <div>
          <p className="eyebrow">Visual didático</p>
          <h3>{title}</h3>
        </div>
        <span className="reynolds-scene__badge">
          <Waves aria-hidden="true" size={14} />
          Escoamento
        </span>
      </div>
      <p className="reynolds-scene__subtitle">{subtitle}</p>

      <div className="reynolds-scene__flow">
        <span className="reynolds-scene__pipe" />
        <span className="reynolds-scene__pipe reynolds-scene__pipe--accent" />
        <span className="reynolds-scene__orb reynolds-scene__orb--one" />
        <span className="reynolds-scene__orb reynolds-scene__orb--two" />
        <span className="reynolds-scene__orb reynolds-scene__orb--three" />
      </div>

      <div className="reynolds-scene__bands">
        {bands.map((band) => (
          <div className={`reynolds-band ${band.tone}`} key={band.label}>
            <div className="reynolds-band__label">
              <span>{band.label}</span>
              <span>{band.value}%</span>
            </div>
            <div className="reynolds-band__track">
              <div className="reynolds-band__fill" style={{ width: `${band.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MetricGrid({
  items
}: {
  items: Array<{ label: string; value: string; hint: string; icon?: ReactNode }>;
}) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <article className="metric-card" key={item.label}>
          <div className="metric-card__icon" aria-hidden="true">
            {item.icon ?? <Gauge size={16} />}
          </div>
          <div className="metric-card__value">{item.value}</div>
          <div className="metric-card__label">{item.label}</div>
          <div className="metric-card__hint">{item.hint}</div>
        </article>
      ))}
    </div>
  );
}

export function ActionRail({
  title,
  copy,
  action,
  badge
}: {
  title: string;
  copy: string;
  action: string;
  badge: string;
}) {
  return (
    <div className="action-rail">
      <div>
        <p className="eyebrow">{badge}</p>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <span className="action-rail__cta">
        {action}
        <ArrowRight aria-hidden="true" size={16} />
      </span>
    </div>
  );
}

export function AudienceCard({
  title,
  audience,
  bullets
}: {
  title: string;
  audience: string;
  bullets: string[];
}) {
  return (
    <article className="audience-card">
      <div className="audience-card__header">
        <GraduationCap aria-hidden="true" size={18} />
        <div>
          <div className="audience-card__audience">{audience}</div>
          <h4>{title}</h4>
        </div>
      </div>
      <ul className="audience-card__list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </article>
  );
}
