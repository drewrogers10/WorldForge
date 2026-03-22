import { EntityWorkspacePlaceholder } from './EntityWorkspacePlaceholder';

export function PowersPage() {
  return (
    <EntityWorkspacePlaceholder
      description="Capture the rules behind magic, divine gifts, technology, or other extraordinary forces that shape the world."
      focusAreas={[
        'Power sources and who can access them',
        'Limits, costs, and side effects',
        'Signature abilities, schools, or domains',
      ]}
      implementationNote="This workspace is not editable yet, but it now opens a placeholder instead of dropping you on a blank route."
      scopeNote="Use People, Places, Items, Maps, and Events while the full powers editor is still being built."
      title="Powers"
    />
  );
}
