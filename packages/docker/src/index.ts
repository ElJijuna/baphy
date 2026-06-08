export interface DockerImageReference {
  /** Image reference exactly as it appears after FROM options. */
  image: string
  /** Image name without tag or digest. */
  name: string
  /** Effective version: tag, digest, or Docker's implicit "latest". */
  version: string
  /** Tag suffix from the image reference, or null when no tag is present. */
  tag: string | null
  /** Digest suffix from the image reference, or null when no digest is present. */
  digest: string | null
  /** Stage alias from "AS <name>", when present. */
  stage: string | null
}

export function parseDockerfileImages(content: string): DockerImageReference[] {
  return content
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map(parseFromInstruction)
    .filter((image): image is DockerImageReference => image !== null)
}

function parseFromInstruction(line: string): DockerImageReference | null {
  const trimmed = stripComment(line).trim()
  if (!trimmed) {
    return null
  }

  const tokens = trimmed.split(/\s+/)
  if (tokens[0]?.toUpperCase() !== 'FROM') {
    return null
  }

  let imageTokenIndex = 1
  while (tokens[imageTokenIndex]?.startsWith('--')) {
    imageTokenIndex += 1
  }

  const image = tokens[imageTokenIndex]
  if (!image) {
    return null
  }

  const stage =
    tokens[imageTokenIndex + 1]?.toUpperCase() === 'AS'
      ? tokens[imageTokenIndex + 2] ?? null
      : null

  const { name, tag, digest } = splitImageReference(image)

  return {
    image,
    name,
    version: tag ?? digest ?? 'latest',
    tag,
    digest,
    stage,
  }
}

function splitImageReference(image: string): Pick<DockerImageReference, 'name' | 'tag' | 'digest'> {
  const digestStart = image.indexOf('@')
  if (digestStart !== -1) {
    return {
      name: image.slice(0, digestStart),
      tag: null,
      digest: image.slice(digestStart + 1),
    }
  }

  const lastSlash = image.lastIndexOf('/')
  const lastColon = image.lastIndexOf(':')
  if (lastColon > lastSlash) {
    return {
      name: image.slice(0, lastColon),
      tag: image.slice(lastColon + 1),
      digest: null,
    }
  }

  return {
    name: image,
    tag: null,
    digest: null,
  }
}

function stripComment(line: string): string {
  const commentStart = line.indexOf('#')
  return commentStart === -1 ? line : line.slice(0, commentStart)
}
