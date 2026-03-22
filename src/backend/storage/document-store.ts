import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import type {
  CanonicalEntityDocument,
  CanonicalEntityFrontmatter,
  CurrentEntityState,
  DocumentStore,
  EntityReference,
  SnapshotRecord,
} from './types';
import { worldEntityTypeSchema, type WorldEntityType } from '@shared/storage';

const FRONTMATTER_DELIMITER = '---';
const CANONICAL_SYNC_VERSION = 1;

const ENTITY_DIRECTORIES: Record<WorldEntityType, string> = {
  character: 'characters',
  location: 'locations',
  item: 'items',
};

function createContentHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'entity';
}

function canonicalDocumentPath(worldRoot: string, frontmatter: CanonicalEntityFrontmatter): string {
  const directory = path.join(worldRoot, ENTITY_DIRECTORIES[frontmatter.type]);
  return path.join(directory, `${frontmatter.slug}--${frontmatter.id}.md`);
}

function renderFrontmatter(frontmatter: CanonicalEntityFrontmatter): string {
  return JSON.stringify(frontmatter, null, 2);
}

function renderMarkdown(frontmatter: CanonicalEntityFrontmatter, body: string): string {
  const normalizedBody = body.trim().length > 0 ? body.trimEnd() : '';
  return `${FRONTMATTER_DELIMITER}\n${renderFrontmatter(frontmatter)}\n${FRONTMATTER_DELIMITER}\n\n${normalizedBody}\n`;
}

function parseMarkdownDocument(filePath: string): CanonicalEntityDocument {
  const raw = readFileSync(filePath, 'utf8');

  if (!raw.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    throw new Error(`Markdown document ${filePath} is missing JSON frontmatter.`);
  }

  const closingDelimiter = raw.indexOf(`\n${FRONTMATTER_DELIMITER}\n`, FRONTMATTER_DELIMITER.length + 1);

  if (closingDelimiter === -1) {
    throw new Error(`Markdown document ${filePath} is missing a closing frontmatter delimiter.`);
  }

  const frontmatterText = raw
    .slice(FRONTMATTER_DELIMITER.length + 1, closingDelimiter)
    .trim();
  const parsedFrontmatter = JSON.parse(frontmatterText) as Omit<
    CanonicalEntityFrontmatter,
    'slug' | 'syncHash' | 'syncVersion'
  > &
    Partial<Pick<CanonicalEntityFrontmatter, 'slug' | 'syncHash' | 'syncVersion'>>;
  const type = worldEntityTypeSchema.parse(parsedFrontmatter.type);
  const frontmatterBase = {
    id: Number(parsedFrontmatter.id),
    type,
    slug: slugify(parsedFrontmatter.slug ?? parsedFrontmatter.name ?? `${type}-${parsedFrontmatter.id}`),
    name: String(parsedFrontmatter.name ?? ''),
    summary: String(parsedFrontmatter.summary ?? ''),
    quantity:
      parsedFrontmatter.quantity === null || parsedFrontmatter.quantity === undefined
        ? null
        : Number(parsedFrontmatter.quantity),
    location:
      parsedFrontmatter.location && typeof parsedFrontmatter.location === 'object'
        ? {
            id: Number(parsedFrontmatter.location.id),
            name:
              typeof parsedFrontmatter.location.name === 'string'
                ? parsedFrontmatter.location.name
                : null,
          }
        : null,
    ownerCharacter:
      parsedFrontmatter.ownerCharacter && typeof parsedFrontmatter.ownerCharacter === 'object'
        ? {
            id: Number(parsedFrontmatter.ownerCharacter.id),
            name:
              typeof parsedFrontmatter.ownerCharacter.name === 'string'
                ? parsedFrontmatter.ownerCharacter.name
                : null,
          }
        : null,
    existsFromTick: Number(parsedFrontmatter.existsFromTick ?? 0),
    existsToTick:
      parsedFrontmatter.existsToTick === null || parsedFrontmatter.existsToTick === undefined
        ? null
        : Number(parsedFrontmatter.existsToTick),
  };
  const body = raw.slice(closingDelimiter + `\n${FRONTMATTER_DELIMITER}\n`.length).trim();
  const contentHash = createContentHash(
    JSON.stringify({
      ...frontmatterBase,
      body,
    }),
  );

  return {
    path: filePath,
    body,
    contentHash,
    frontmatter: {
      ...frontmatterBase,
      syncHash: contentHash,
      syncVersion: CANONICAL_SYNC_VERSION,
    },
  };
}

function buildCanonicalFrontmatter(state: CurrentEntityState, body: string): CanonicalEntityFrontmatter {
  const baseFrontmatter = {
    id: state.entityId,
    type: state.entityType,
    slug: slugify(state.name),
    name: state.name,
    summary: state.summary,
    quantity: state.quantity,
    location: state.location,
    ownerCharacter: state.ownerCharacter,
    existsFromTick: state.existsFromTick,
    existsToTick: state.existsToTick,
  };
  const contentHash = createContentHash(
    JSON.stringify({
      ...baseFrontmatter,
      body,
    }),
  );

  return {
    ...baseFrontmatter,
    syncHash: contentHash,
    syncVersion: CANONICAL_SYNC_VERSION,
  };
}

function collectMarkdownFiles(rootDirectory: string): string[] {
  const stack = [rootDirectory];
  const files: string[] = [];

  while (stack.length > 0) {
    const directory = stack.pop()!;

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.worldforge') {
        continue;
      }

      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(entryPath);
      }
    }
  }

  return files.sort();
}

function matchingDocumentPaths(
  documents: CanonicalEntityDocument[],
  reference: EntityReference,
): string[] {
  return documents
    .filter(
      (document) =>
        document.frontmatter.type === reference.entityType &&
        document.frontmatter.id === reference.entityId,
    )
    .map((document) => document.path);
}

export function createDocumentStore(worldRoot: string): DocumentStore {
  function ensureWorldStructure(): void {
    mkdirSync(worldRoot, { recursive: true });

    for (const directory of Object.values(ENTITY_DIRECTORIES)) {
      mkdirSync(path.join(worldRoot, directory), { recursive: true });
    }

    mkdirSync(path.join(worldRoot, '.worldforge', 'snapshots'), { recursive: true });
    mkdirSync(path.join(worldRoot, '.worldforge', 'vector'), { recursive: true });
  }

  function readCanonicalDocuments(): CanonicalEntityDocument[] {
    ensureWorldStructure();

    return collectMarkdownFiles(worldRoot).map((filePath) => parseMarkdownDocument(filePath));
  }

  function writeCanonicalDocument(
    state: CurrentEntityState,
    options?: {
      body?: string;
    },
  ): CanonicalEntityDocument {
    ensureWorldStructure();

    const existingDocuments = readCanonicalDocuments();
    const existingPaths = matchingDocumentPaths(existingDocuments, state);
    const existingDocument = existingDocuments.find(
      (document) =>
        document.frontmatter.type === state.entityType &&
        document.frontmatter.id === state.entityId,
    );
    const body = options?.body ?? existingDocument?.body ?? state.summary;
    const frontmatter = buildCanonicalFrontmatter(state, body);
    const targetPath = canonicalDocumentPath(worldRoot, frontmatter);

    mkdirSync(path.dirname(targetPath), { recursive: true });

    const sourcePath = existingPaths.find((filePath) => filePath !== targetPath);

    if (sourcePath) {
      renameSync(sourcePath, targetPath);
    }

    for (const stalePath of existingPaths) {
      if (stalePath !== targetPath && stalePath !== sourcePath) {
        rmSync(stalePath, { force: true });
      }
    }

    writeFileSync(targetPath, renderMarkdown(frontmatter, body), 'utf8');

    return parseMarkdownDocument(targetPath);
  }

  function writeSnapshot(snapshot: SnapshotRecord): string {
    ensureWorldStructure();

    const snapshotPath = path.join(
      worldRoot,
      '.worldforge',
      'snapshots',
      snapshot.entityType,
      String(snapshot.entityId),
      `${snapshot.tick}.md`,
    );

    mkdirSync(path.dirname(snapshotPath), { recursive: true });

    const body = [
      `# ${snapshot.title}`,
      '',
      snapshot.summary,
      '',
      ...snapshot.details.map((detail) => `- ${detail}`),
    ].join('\n');

    const frontmatter = {
      entityId: snapshot.entityId,
      entityType: snapshot.entityType,
      tick: snapshot.tick,
      status: snapshot.status,
    };

    writeFileSync(
      snapshotPath,
      `${FRONTMATTER_DELIMITER}\n${JSON.stringify(frontmatter, null, 2)}\n${FRONTMATTER_DELIMITER}\n\n${body.trimEnd()}\n`,
      'utf8',
    );

    return snapshotPath;
  }

  return {
    worldRoot,
    ensureWorldStructure,
    writeCanonicalDocument,
    readCanonicalDocuments,
    writeSnapshot,
  };
}
