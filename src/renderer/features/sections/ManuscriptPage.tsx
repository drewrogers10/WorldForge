import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function ManuscriptPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Planned Buckets',
          items: ['Main canon', 'Side stories', 'POV changes', 'Short stories in the same world'],
        },
        {
          title: 'Boundary',
          body: 'Manuscript is for actual story text. Keep supporting logic in Theories and high-level structure in Plot so drafted prose does not get mixed with planning notes.',
        },
        {
          title: 'Current Coverage',
          body: 'This route establishes where prose will live once the manuscript editor and organization tools are implemented.',
        },
      ]}
      description="Manuscript is the home for the story itself: chapters, side material, alternate points of view, and other prose that belongs to the world."
      title="Manuscript"
    />
  );
}
