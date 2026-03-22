import type { SearchDocumentBuilder } from './types';

function formatRelation(label: string, value: string | null | undefined): string | null {
  return value ? `${label}: ${value}` : null;
}

export function createSearchDocumentBuilder(): SearchDocumentBuilder {
  return {
    build({ document, currentState }) {
      const relationshipLines = [
        formatRelation('Location', currentState?.location?.name ?? document.frontmatter.location?.name),
        formatRelation(
          'Owner',
          currentState?.ownerCharacter?.name ?? document.frontmatter.ownerCharacter?.name,
        ),
      ].filter((value): value is string => Boolean(value));

      const quantityValue = currentState?.quantity ?? document.frontmatter.quantity;
      const quantityLine =
        quantityValue !== null ? `Quantity: ${quantityValue}` : null;
      const existenceLine = `Exists: ${document.frontmatter.existsFromTick} -> ${
        document.frontmatter.existsToTick ?? 'present'
      }`;

      return {
        entityType: document.frontmatter.type,
        entityId: document.frontmatter.id,
        title: document.frontmatter.name,
        summary: document.frontmatter.summary,
        body: [document.body, quantityLine, existenceLine].filter(Boolean).join('\n\n').trim(),
        relationshipsText: relationshipLines.join('\n'),
        canonicalPath: document.path,
        contentHash: document.contentHash,
        updatedAt: Date.now(),
      };
    },
  };
}
