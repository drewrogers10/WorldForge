import type { ReactNode } from 'react';

type PanelProps = {
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
};

export function Panel({ badge, children, className, title }: PanelProps) {
  const panelClassName = className ? `panel ${className}` : 'panel';

  return (
    <section className={panelClassName}>
      <div className="panel-header">
        <h2>{title}</h2>
        {badge}
      </div>

      {children}
    </section>
  );
}
