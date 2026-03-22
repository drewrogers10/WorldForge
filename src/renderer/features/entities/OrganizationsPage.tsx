import { WorkspacePlaceholderPage } from '@renderer/features/sections/WorkspacePlaceholderPage';

export function OrganizationsPage() {
  return (
    <WorkspacePlaceholderPage
      cards={[
        {
          title: 'Tracks',
          items: [
            'Factions, houses, guilds, governments, and other institutions',
            'Leaders, members, rivalries, and obligations',
            'Territory, resources, goals, and historical influence',
          ],
        },
        {
          title: 'Boundary',
          body: 'Organizations belong in World Elements because they exist inside the canon setting and can directly affect people, places, items, and events.',
        },
        {
          title: 'Current Coverage',
          body: 'The organizations workspace is active in navigation now, but its dedicated editor still needs to be built.',
        },
      ]}
      description="Organizations tracks the groups that shape the setting, from major governments to local factions and institutions."
      title="Organizations"
    />
  );
}
