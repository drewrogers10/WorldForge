import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function WritingIdeasPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Examples',
          items: [
            'Reusable plot patterns and scene structures',
            'Motifs, prompts, and story devices worth saving',
            'Fun ideas that may fit later even if they do not belong to the current plot yet',
          ],
        },
        {
          title: 'Boundary',
          body: 'Use Writing Ideas for reusable inspiration and craft notes, not for committed manuscript text or settled canon records.',
        },
        {
          title: 'Current Coverage',
          body: 'This page gives saved writing ideas a dedicated home now so they do not get mixed into plot notes or world records.',
        },
      ]}
      description="Writing Ideas is the scratch space for patterns, prompts, and concepts you want to revisit when shaping scenes or future stories."
      title="Writing Ideas"
    />
  );
}
