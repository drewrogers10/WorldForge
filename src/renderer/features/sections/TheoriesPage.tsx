import { WorkspacePlaceholderPage } from './WorkspacePlaceholderPage';

export function TheoriesPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Useful For',
          items: [
            'Explanations of magic, metaphysics, or cosmology',
            'Political or social structures that need internal logic',
            'Any hidden framework that keeps the story coherent behind the scenes',
          ],
        },
        {
          title: 'Boundary',
          body: 'These notes inform the story but are not manuscript pages. Use Theories for the logic behind the world, not for prose meant to appear as chapters.',
        },
        {
          title: 'Current Coverage',
          body: 'Theories is active in navigation now so the section has a clear home before its editor and storage model are built.',
        },
      ]}
      description="Theories holds explanatory notes that support the setting and story without becoming part of the manuscript itself."
      title="Theories"
    />
  );
}
