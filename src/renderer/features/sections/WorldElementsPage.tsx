import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function WorldElementsPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Contains',
          items: [
            'People, places, maps, items, and events',
            'Power systems and organizations that exist inside the setting',
            'Canon-facing records the manuscript can draw from directly',
          ],
        },
        {
          title: 'Story Role',
          body: 'Use this section for material that belongs to the story world itself. If a reader could eventually encounter it as part of the setting, it belongs here.',
        },
        {
          title: 'Current Coverage',
          body: 'People, places, items, maps, and events are editable now. Powers and organizations are active placeholders while their dedicated editors are still being built.',
        },
      ]}
      description="World Elements is the canon-facing foundation of the project. It holds the people, places, structures, and systems that make the setting feel consistent."
      title="World Elements"
    />
  );
}
