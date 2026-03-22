import { Panel } from '@renderer/components/Panel';

type WorkspacePlaceholderCard = {
  body?: string;
  items?: string[];
  title: string;
};

type WorkspacePlaceholderPageProps = {
  cards: WorkspacePlaceholderCard[];
  description: string;
  title: string;
};

export function WorkspacePlaceholderPage({
  cards,
  description,
  title,
}: WorkspacePlaceholderPageProps) {
  return (
    <main className="content-grid">
      <Panel className="workspace-placeholder-panel" title={title}>
        <p className="muted">{description}</p>

        {cards.map((card) => (
          <div className="linked-card" key={card.title}>
            <p className="card-title">{card.title}</p>

            {card.body ? <p className="muted helper-text">{card.body}</p> : null}

            {card.items ? (
              <ul className="placeholder-list">
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </Panel>
    </main>
  );
}
