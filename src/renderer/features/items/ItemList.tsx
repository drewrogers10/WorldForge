import type { Item } from '@shared/item';
import { Panel } from '@renderer/components/Panel';

type ItemListProps = {
  filteredItems: Item[];
  isLoading: boolean;
  itemAssignmentFilter: string;
  itemSearch: string;
  items: Item[];
  onItemAssignmentFilterChange: (value: string) => void;
  onItemSearchChange: (value: string) => void;
  onSelectItem: (id: number) => void;
  selectedItemId: number | null;
};

function describeAssignment(item: Item): string {
  if (item.ownerCharacter) {
    return `Owner: ${item.ownerCharacter.name}`;
  }

  if (item.location) {
    return `Place: ${item.location.name}`;
  }

  return 'Unassigned';
}

export function ItemList({
  filteredItems,
  isLoading,
  itemAssignmentFilter,
  itemSearch,
  items,
  onItemAssignmentFilterChange,
  onItemSearchChange,
  onSelectItem,
  selectedItemId,
}: ItemListProps) {
  return (
    <Panel
      badge={
        <span className="pill">
          {filteredItems.length}/{items.length}
        </span>
      }
      title="Items"
    >
      <div className="list-controls">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => {
              onItemSearchChange(event.target.value);
            }}
            placeholder="Search name, summary, owner, or place"
            value={itemSearch}
          />
        </label>

        <label>
          <span>Filter by assignment</span>
          <select
            onChange={(event) => {
              onItemAssignmentFilterChange(event.target.value);
            }}
            value={itemAssignmentFilter}
          >
            <option value="all">All items</option>
            <option value="unassigned">Unassigned only</option>
            <option value="owned">Owned by people</option>
            <option value="stored">Stored at places</option>
          </select>
        </label>
      </div>

      {isLoading ? <p className="muted">Loading items...</p> : null}

      {!isLoading && items.length === 0 ? (
        <p className="muted">No items yet. Create the first one below.</p>
      ) : null}

      {!isLoading && items.length > 0 && filteredItems.length === 0 ? (
        <p className="muted">No items match the current search or filter.</p>
      ) : null}

      <ul className="entity-list">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <button
              className={
                item.id === selectedItemId ? 'entity-list-item active' : 'entity-list-item'
              }
              onClick={() => {
                onSelectItem(item.id);
              }}
              type="button"
            >
              <div className="entity-list-heading">
                <strong>{item.name}</strong>
                <span className="pill small">Qty {item.quantity}</span>
              </div>
              <span>{describeAssignment(item)}</span>
              <span>{item.summary || 'No summary yet.'}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
