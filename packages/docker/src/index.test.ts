import { describe, expect, it } from 'vitest';
import { parseDockerfileImages } from './index.js';

describe('parseDockerfileImages', () => {
  it('extracts one FROM image and version', () => {
    const result = parseDockerfileImages(`
      FROM node:20-alpine
      WORKDIR /app
    `);

    expect(result).toEqual([
      {
        image: 'node:20-alpine',
        name: 'node',
        version: '20-alpine',
        tag: '20-alpine',
        digest: null,
        stage: null,
        isStageReference: false,
      },
    ]);
  });

  it('extracts multiple FROM images and stage aliases from a multi-stage Dockerfile', () => {
    const result = parseDockerfileImages(`
      FROM oven/bun:1-alpine AS builder

      WORKDIR /app
      RUN bun run ui:build

      FROM oven/bun:1-alpine

      WORKDIR /app
      COPY --from=builder /app/src ./src
    `);

    expect(result).toEqual([
      {
        image: 'oven/bun:1-alpine',
        name: 'oven/bun',
        version: '1-alpine',
        tag: '1-alpine',
        digest: null,
        stage: 'builder',
        isStageReference: false,
      },
      {
        image: 'oven/bun:1-alpine',
        name: 'oven/bun',
        version: '1-alpine',
        tag: '1-alpine',
        digest: null,
        stage: null,
        isStageReference: false,
      },
    ]);
  });

  it('handles FROM options, implicit latest tags, registries with ports, and digests', () => {
    const result = parseDockerfileImages(`
      FROM --platform=linux/amd64 alpine
      FROM localhost:5000/team/api:2.4.1 AS api
      FROM gcr.io/distroless/nodejs@sha256:abc123
    `);

    expect(result).toEqual([
      {
        image: 'alpine',
        name: 'alpine',
        version: 'latest',
        tag: null,
        digest: null,
        stage: null,
        isStageReference: false,
      },
      {
        image: 'localhost:5000/team/api:2.4.1',
        name: 'localhost:5000/team/api',
        version: '2.4.1',
        tag: '2.4.1',
        digest: null,
        stage: 'api',
        isStageReference: false,
      },
      {
        image: 'gcr.io/distroless/nodejs@sha256:abc123',
        name: 'gcr.io/distroless/nodejs',
        version: 'sha256:abc123',
        tag: null,
        digest: 'sha256:abc123',
        stage: null,
        isStageReference: false,
      },
    ]);
  });

  it('ignores full-line comments, including indented ones', () => {
    const result = parseDockerfileImages(`
      # FROM fake:1.0
        # FROM another-fake:2.0
      FROM node:20
    `);

    expect(result).toEqual([
      {
        image: 'node:20',
        name: 'node',
        version: '20',
        tag: '20',
        digest: null,
        stage: null,
        isStageReference: false,
      },
    ]);
  });

  it('keeps the stage alias when a comment line sits between continuations', () => {
    const result = parseDockerfileImages(
      ['FROM node:20 \\', '# comment between continuation lines', '  AS builder'].join('\n'),
    );

    expect(result).toEqual([
      {
        image: 'node:20',
        name: 'node',
        version: '20',
        tag: '20',
        digest: null,
        stage: 'builder',
        isStageReference: false,
      },
    ]);
  });

  it('resolves ARG defaults declared before the first FROM', () => {
    const result = parseDockerfileImages(`
      ARG VERSION=20-alpine
      ARG REGISTRY="gcr.io"
      FROM \${REGISTRY}/node:\${VERSION}
    `);

    expect(result).toEqual([
      {
        image: 'gcr.io/node:20-alpine',
        name: 'gcr.io/node',
        version: '20-alpine',
        tag: '20-alpine',
        digest: null,
        stage: null,
        isStageReference: false,
      },
    ]);
  });

  it('supports $NAME and fallback forms, leaving unset ARGs literal', () => {
    const result = parseDockerfileImages(`
      ARG TAG=18
      FROM node:$TAG
      FROM \${BASE_IMAGE:-alpine}
      FROM repo/\${UNSET_ARG}
    `);

    expect(result.map((r) => r.image)).toEqual(['node:18', 'alpine', 'repo/${UNSET_ARG}']);
  });

  it('ignores ARG instructions declared after the first FROM for FROM resolution', () => {
    const result = parseDockerfileImages(`
      FROM alpine
      ARG TAG=20
      FROM node:\${TAG}
    `);

    expect(result.map((r) => r.image)).toEqual(['alpine', 'node:${TAG}']);
  });

  it('flags FROM references to previous stages, case-insensitively', () => {
    const result = parseDockerfileImages(`
      FROM node:20 AS Builder
      FROM builder
      FROM nginx:alpine
    `);

    expect(result.map((r) => ({ image: r.image, isStageReference: r.isStageReference }))).toEqual([
      { image: 'node:20', isStageReference: false },
      { image: 'builder', isStageReference: true },
      { image: 'nginx:alpine', isStageReference: false },
    ]);
  });
});
