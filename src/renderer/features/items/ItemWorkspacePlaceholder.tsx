import { Panel } from '@renderer/components/Panel';

export function ItemWorkspacePlaceholder() {
  return (
    <main className="content-grid">
      <Panel className="entity-placeholder-panel" title="Items">
        <p className="muted">
          Items cover objects, artifacts, equipment, goods, and important
          possessions that tie economy, movement, relationships, and plot
          consequences together.
        </p>

        <div className="linked-card">
          <p className="card-title">Tracks</p>
          <ul className="placeholder-list">
            <li>What an item is</li>
            <li>Where it is</li>
            <li>Who owns it</li>
            <li>What it is worth</li>
            <li>What role it plays in the story or setting</li>
          </ul>
        </div>

        <div className="linked-card">
          <p className="card-title">Current Coverage</p>
          <p className="muted helper-text">
            Item migrations, queries, services, and typed IPC are already
            integrated. Renderer CRUD is intentionally deferred to keep this
            merge stable.
          </p>
        </div>

        <p className="muted">
          Current backend support includes list, detail, create, update, and
          delete operations with assignment rules for either a person or a
          place.
        </p>
      </Panel>
    </main>
  );
}
