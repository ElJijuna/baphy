export interface DockerImageReference {
  /** Image reference as it appears after FROM options, with ARGs resolved when possible. */
  image: string;
  /** Image name without tag or digest. */
  name: string;
  /** Effective version: tag, digest, or Docker's implicit "latest". */
  version: string;
  /** Tag suffix from the image reference, or null when no tag is present. */
  tag: string | null;
  /** Digest suffix from the image reference, or null when no digest is present. */
  digest: string | null;
  /** Stage alias from "AS <name>", when present. */
  stage: string | null;
  /** True when the FROM references a previous build stage instead of an image. */
  isStageReference: boolean;
}

/**
 * Matches ${NAME}, ${NAME:-fallback}, and $NAME variable references.
 */
const VARIABLE_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

export function parseDockerfileImages(content: string): DockerImageReference[] {
  // Comment lines are removed before joining continuations: Docker allows
  // full-line comments between continuation lines, and "#" is only a comment
  // when it starts the line — a mid-line "#" is a literal character.
  const lines = content
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
    .replace(/\\\r?\n/g, ' ')
    .split('\n');

  // Only ARGs declared before the first FROM are usable in FROM lines.
  const args = new Map<string, string>();
  const stageAliases = new Set<string>();
  const images: DockerImageReference[] = [];
  let sawFrom = false;

  for (const line of lines) {
    const tokens = line.trim().split(/\s+/);
    const instruction = tokens[0]?.toUpperCase();

    if (instruction === 'ARG' && !sawFrom) {
      collectArgDefaults(tokens.slice(1), args);
      continue;
    }

    if (instruction !== 'FROM') {
      continue;
    }
    sawFrom = true;

    const image = parseFromInstruction(tokens, args, stageAliases);
    if (image) {
      images.push(image);
      if (image.stage) {
        stageAliases.add(image.stage.toLowerCase());
      }
    }
  }

  return images;
}

function collectArgDefaults(declarations: string[], args: Map<string, string>): void {
  for (const declaration of declarations) {
    const equals = declaration.indexOf('=');
    if (equals === -1) {
      continue;
    }
    const name = declaration.slice(0, equals);
    const value = declaration.slice(equals + 1).replace(/^(["'])(.*)\1$/, '$2');
    args.set(name, value);
  }
}

function substituteArgs(value: string, args: Map<string, string>): string {
  return value.replace(VARIABLE_PATTERN, (match, braced, fallback, bare) => {
    const resolved = args.get(braced ?? bare);
    if (resolved !== undefined && resolved !== '') {
      return resolved;
    }
    if (fallback !== undefined) {
      return fallback;
    }
    // Unresolved without fallback: keep the reference literal.
    return resolved ?? match;
  });
}

function parseFromInstruction(
  tokens: string[],
  args: Map<string, string>,
  stageAliases: Set<string>,
): DockerImageReference | null {
  let imageTokenIndex = 1;
  while (tokens[imageTokenIndex]?.startsWith('--')) {
    imageTokenIndex += 1;
  }

  const rawImage = tokens[imageTokenIndex];
  if (!rawImage) {
    return null;
  }
  const image = substituteArgs(rawImage, args);

  const stage =
    tokens[imageTokenIndex + 1]?.toUpperCase() === 'AS'
      ? (tokens[imageTokenIndex + 2] ?? null)
      : null;

  const { name, tag, digest } = splitImageReference(image);

  return {
    image,
    name,
    version: tag ?? digest ?? 'latest',
    tag,
    digest,
    stage,
    isStageReference: stageAliases.has(image.toLowerCase()),
  };
}

function splitImageReference(image: string): Pick<DockerImageReference, 'name' | 'tag' | 'digest'> {
  const digestStart = image.indexOf('@');
  if (digestStart !== -1) {
    return {
      name: image.slice(0, digestStart),
      tag: null,
      digest: image.slice(digestStart + 1),
    };
  }

  const lastSlash = image.lastIndexOf('/');
  const lastColon = image.lastIndexOf(':');
  if (lastColon > lastSlash) {
    return {
      name: image.slice(0, lastColon),
      tag: image.slice(lastColon + 1),
      digest: null,
    };
  }

  return {
    name: image,
    tag: null,
    digest: null,
  };
}
