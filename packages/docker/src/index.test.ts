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
      },
      {
        image: 'oven/bun:1-alpine',
        name: 'oven/bun',
        version: '1-alpine',
        tag: '1-alpine',
        digest: null,
        stage: null,
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
      },
      {
        image: 'localhost:5000/team/api:2.4.1',
        name: 'localhost:5000/team/api',
        version: '2.4.1',
        tag: '2.4.1',
        digest: null,
        stage: 'api',
      },
      {
        image: 'gcr.io/distroless/nodejs@sha256:abc123',
        name: 'gcr.io/distroless/nodejs',
        version: 'sha256:abc123',
        tag: null,
        digest: 'sha256:abc123',
        stage: null,
      },
    ]);
  });
});
