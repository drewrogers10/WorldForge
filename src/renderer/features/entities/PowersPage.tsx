import { WorkspacePlaceholderPage } from '@renderer/features/sections/WorkspacePlaceholderPage';

export function PowersPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Tracks',
          items: [
            'Recognizable power systems and disciplines inside the setting',
            'Who can access those powers and how they are practiced',
            'Costs, limits, institutions, and consequences tied to their use',
          ],
        },
        {
          title: 'Boundary',
          body: 'Use Powers for the in-world systems characters deal with directly. Use Theories for behind-the-scenes explanations of why those systems work.',
        },
        {
          title: 'Current Coverage',
          body: 'The powers workspace is active in navigation now, but its dedicated editor still needs to be built.',
        },
      ]}
      description="Powers covers the active systems, forces, and disciplines that operate inside the setting, from magic traditions to divine gifts to unusual technologies."
      title="Powers"
    />
  );
}
