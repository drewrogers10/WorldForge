import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SemanticSearchInput, WorldSearchHit } from '@shared/storage';
import type { EntityReference, SearchDocument, VectorIndex } from './types';

type VectorChunkRecord = {
  entityType: EntityReference['entityType'];
  entityId: number;
  chunkId: string;
  title: string;
  summary: string;
  text: string;
  vector: number[];
};

type PersistedIndex = {
  records: VectorChunkRecord[];
};

const VECTOR_DIMENSION = 128;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function hashToken(token: string): number {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildVector(input: string): number[] {
  const vector = new Array<number>(VECTOR_DIMENSION).fill(0);
  const tokens = tokenize(input);

  for (const token of tokens) {
    const bucket = hashToken(token) % VECTOR_DIMENSION;
    const currentValue = vector[bucket] ?? 0;
    vector[bucket] = currentValue + 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function chunkText(document: SearchDocument): VectorChunkRecord[] {
  const sourceSections = document.body
    .split(/\n{2,}/g)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
  const sections = sourceSections.length > 0 ? sourceSections : [document.summary];

  return sections.map((text, index) => ({
    entityType: document.entityType,
    entityId: document.entityId,
    chunkId: `${document.entityType}:${document.entityId}:${index}`,
    title: document.title,
    summary: document.summary,
    text,
    vector: buildVector(text),
  }));
}

export function createVectorIndex(storagePath: string): VectorIndex {
  let records: VectorChunkRecord[] = [];

  function persist(): void {
    mkdirSync(path.dirname(storagePath), { recursive: true });
    writeFileSync(storagePath, JSON.stringify({ records } satisfies PersistedIndex, null, 2), 'utf8');
  }

  return {
    engineName: 'embedded-hash-vector',
    open(): void {
      mkdirSync(path.dirname(storagePath), { recursive: true });

      try {
        const raw = readFileSync(storagePath, 'utf8');
        records = (JSON.parse(raw) as PersistedIndex).records ?? [];
      } catch {
        records = [];
        persist();
      }
    },
    upsertDocument(document: SearchDocument): void {
      records = records.filter(
        (record) =>
          !(
            record.entityType === document.entityType &&
            record.entityId === document.entityId
          ),
      );
      records.push(...chunkText(document));
      persist();
    },
    deleteEntity(reference: EntityReference): void {
      records = records.filter(
        (record) =>
          !(
            record.entityType === reference.entityType &&
            record.entityId === reference.entityId
          ),
      );
      persist();
    },
    pruneMissingEntities(validReferences: EntityReference[]): number {
      const validKeys = new Set(
        validReferences.map((reference) => `${reference.entityType}:${reference.entityId}`),
      );
      const beforeCount = records.length;

      records = records.filter((record) =>
        validKeys.has(`${record.entityType}:${record.entityId}`),
      );

      if (records.length !== beforeCount) {
        persist();
      }

      return beforeCount - records.length;
    },
    search(input: SemanticSearchInput): WorldSearchHit[] {
      const queryVector = buildVector(input.query);
      const bestByEntity = new Map<string, WorldSearchHit>();
      const limit = input.limit ?? 20;

      for (const record of records) {
        const score = cosineSimilarity(queryVector, record.vector);

        if (score <= 0) {
          continue;
        }

        const key = `${record.entityType}:${record.entityId}`;
        const existing = bestByEntity.get(key);

        if (existing && existing.score >= score) {
          continue;
        }

        bestByEntity.set(key, {
          entityType: record.entityType,
          entityId: record.entityId,
          title: record.title,
          summary: record.summary,
          matchedText: record.text,
          score,
          tick: input.tick,
        });
      }

      return [...bestByEntity.values()]
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
    },
  };
}
