export interface DockerImageReference {
  /** Image reference exactly as it appears after FROM options. */
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
}

export function parseDockerfileImages(content: string): DockerImageReference[] {
  // Comment lines are removed before joining continuations: Docker allows
  // full-line comments between continuation lines, and "#" is only a comment
  // when it starts the line — a mid-line "#" is a literal character.
  return content
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
    .replace(/\\\r?\n/g, ' ')
    .split('\n')
    .map(parseFromInstruction)
    .filter((image): image is DockerImageReference => image !== null);
}

function parseFromInstruction(line: string): DockerImageReference | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens[0]?.toUpperCase() !== 'FROM') {
    return null;
  }

  let imageTokenIndex = 1;
  while (tokens[imageTokenIndex]?.startsWith('--')) {
    imageTokenIndex += 1;
  }

  const image = tokens[imageTokenIndex];
  if (!image) {
    return null;
  }

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
