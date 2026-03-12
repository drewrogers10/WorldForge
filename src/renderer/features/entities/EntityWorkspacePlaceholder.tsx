import { Panel } from '@renderer/components/Panel';

type EntityWorkspacePlaceholderProps = {
  description: string;
  focusAreas: string[];
  implementationNote: string;
  scopeNote?: string;
  title: string;
};

export function EntityWorkspacePlaceholder({
  description,
  focusAreas,
  implementationNote,
  scopeNote,
  title,
}: EntityWorkspacePlaceholderProps) {
  return (
    <main className="content-grid">
      <Panel className="entity-placeholder-panel" title={title}>
        <p className="muted">{description}</p>

        <div className="linked-card">
          <p className="card-title">Tracks</p>
          <ul className="placeholder-list">
            {focusAreas.map((focusArea) => (
              <li key={focusArea}>{focusArea}</li>
            ))}
          </ul>
        </div>

        {scopeNote ? (
          <div className="linked-card">
            <p className="card-title">Scope</p>
            <p className="muted helper-text">{scopeNote}</p>
          </div>
        ) : null}

        <div className="linked-card">
          <p className="card-title">Current Coverage</p>
          <p className="muted helper-text">{implementationNote}</p>
        </div>
      </Panel>
    </main>
  );
}
