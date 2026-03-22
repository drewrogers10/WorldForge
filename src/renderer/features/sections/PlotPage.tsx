import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function PlotPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Tracks',
          items: ['Broad story beats', 'Major character arcs', 'Turning points and progression checkpoints'],
        },
        {
          title: 'Why It Matters',
          body: 'Use Plot to make sure the story moves with intent. This is the place for big-shape planning before scenes are written or revised.',
        },
        {
          title: 'Current Coverage',
          body: 'Plot is active as a dedicated planning destination now and will later grow into a fuller story-structure workspace.',
        },
      ]}
      description="Plot is where the story gets its backbone: major events, character progression, and the broad structure that keeps the manuscript moving with purpose."
      title="Plot"
    />
  );
}
