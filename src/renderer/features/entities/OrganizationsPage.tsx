import { EntityWorkspacePlaceholder } from './EntityWorkspacePlaceholder';

export function OrganizationsPage() {
  return (
    <EntityWorkspacePlaceholder
      description="Track factions, houses, guilds, governments, and every other group that influences the setting."
      focusAreas={[
        'Leaders, members, and rivalries',
        'Territory, resources, and responsibilities',
        'Goals, allegiances, and historical impact',
      ]}
      implementationNote="The dedicated organizations editor still needs to be built, but the route now stays inside the app shell so you can move elsewhere."
      scopeNote="For now, record related people, places, items, and events in the finished workspaces."
      title="Organizations"
    />
  );
}
