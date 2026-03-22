import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function WritingPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Subsections',
          items: ['Manuscript', 'Plot', 'Writing Ideas'],
        },
        {
          title: 'What Belongs Here',
          body: 'Use Writing for draft prose, story structure, and reusable craft notes. This section turns world material into narrative work.',
        },
        {
          title: 'Current Coverage',
          body: 'The Writing section is active now with dedicated placeholder pages for each subsection while the full editing workflows are still ahead.',
        },
      ]}
      description="Writing groups the work that shapes the story itself, from draft chapters to plot planning to saved ideas worth reusing later."
      title="Writing"
    />
  );
}
