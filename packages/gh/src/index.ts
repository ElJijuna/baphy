export interface ReadmeBadge {
  /** Image alt text from the badge markdown. */
  alt: string;
  /** Badge image URL. */
  image: string;
  /** Link target wrapping the badge, or null for bare badge images. */
  target: string | null;
  /** Human label inferred from alt text or Shields label query. */
  label: string;
  /** Badge subject inferred from a shields.io path when possible. */
  subject: string | null;
  /** Badge image provider hostname. */
  service: string | null;
}

export interface ReadmeLink {
  /** Human link text with markdown formatting removed. */
  text: string;
  /** Link URL. */
  url: string;
}

export interface ReadmeSection {
  /** Markdown heading depth, where 1 is "#". */
  depth: number;
  /** Heading text with markdown formatting removed. */
  title: string;
  /** GitHub-style heading slug. */
  slug: string;
}

export interface ReadmeInfo {
  /** First level-1 heading, or the first heading when no H1 exists. */
  title: string | null;
  /** First meaningful paragraph after title and badges. */
  description: string | null;
  /** Badge images found in markdown links or bare image syntax. */
  badges: ReadmeBadge[];
  /** Non-badge markdown links found outside fenced code blocks. */
  links: ReadmeLink[];
  /** Markdown headings after the README title. */
  sections: ReadmeSection[];
  /** Section slugs, useful for repo nav/index rendering. */
  tableOfContents: string[];
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const LINKED_BADGE_PATTERN = /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g;
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;
const LINK_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

export function parseReadme(content: string): ReadmeInfo {
  const withoutCode = stripFencedCode(content);
  const lines = withoutCode.split(/\r?\n/);
  const headings = extractHeadings(lines);
  const titleHeading = headings.find((heading) => heading.depth === 1) ?? headings[0] ?? null;
  const sections = headings.filter((heading) => heading !== titleHeading);
  const badges = extractBadges(withoutCode);

  return {
    title: titleHeading ? cleanInlineMarkdown(titleHeading.title) : null,
    description: extractDescription(lines, titleHeading?.lineIndex ?? -1),
    badges,
    links: extractLinks(withoutCode),
    sections: sections.map(({ depth, title, slug }) => ({ depth, title, slug })),
    tableOfContents: sections.map((section) => section.slug),
  };
}

interface InternalHeading extends ReadmeSection {
  lineIndex: number;
}

function stripFencedCode(content: string): string {
  const lines = content.split(/\r?\n/);
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return '';
      }

      return inFence ? '' : line;
    })
    .join('\n');
}

function extractHeadings(lines: string[]): InternalHeading[] {
  const usedSlugs = new Map<string, number>();
  const headings: InternalHeading[] = [];

  for (const [lineIndex, rawLine] of lines.entries()) {
    const match = rawLine.trim().match(HEADING_PATTERN);
    if (!match) {
      continue;
    }

    const title = cleanInlineMarkdown(match[2]);
    headings.push({
      depth: match[1].length,
      title,
      slug: createUniqueSlug(title, usedSlugs),
      lineIndex,
    });
  }

  return headings;
}

function extractDescription(lines: string[], titleLineIndex: number): string | null {
  for (const rawLine of lines.slice(Math.max(titleLineIndex + 1, 0))) {
    const line = rawLine.trim();
    if (
      !line ||
      line === '---' ||
      line.startsWith('<') ||
      line.startsWith('[') ||
      line.startsWith('!')
    ) {
      continue;
    }

    if (HEADING_PATTERN.test(line)) {
      return null;
    }

    return cleanParagraphMarkdown(line);
  }

  return null;
}

function extractBadges(content: string): ReadmeBadge[] {
  const badges: ReadmeBadge[] = [];
  const linkedBadgeImages = new Set<string>();

  for (const match of content.matchAll(LINKED_BADGE_PATTERN)) {
    linkedBadgeImages.add(match[2]);
    badges.push(createBadge(match[1], match[2], match[3]));
  }

  for (const match of content.matchAll(IMAGE_PATTERN)) {
    if (!linkedBadgeImages.has(match[2]) && isLikelyBadge(match[1], match[2])) {
      badges.push(createBadge(match[1], match[2], null));
    }
  }

  return badges;
}

function createBadge(alt: string, image: string, target: string | null): ReadmeBadge {
  const imageUrl = parseUrl(image);
  const label = imageUrl?.searchParams.get('label') ?? alt.trim();

  return {
    alt: alt.trim(),
    image,
    target,
    label,
    subject: inferBadgeSubject(imageUrl),
    service:
      imageUrl?.hostname.endsWith('shields.io') === true
        ? 'shields.io'
        : (imageUrl?.hostname ?? null),
  };
}

function inferBadgeSubject(url: URL | null): string | null {
  if (!url) {
    return null;
  }

  if (!url.hostname.endsWith('shields.io')) {
    return null;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'badge') {
    return decodeBadgeText(parts[1]?.split('-')[0] ?? '');
  }

  if (parts[0] === 'npm') {
    return 'npm';
  }

  if (
    parts[0] === 'github' &&
    parts[1] === 'actions' &&
    parts[2] === 'workflow' &&
    parts[3] === 'status'
  ) {
    return 'github actions workflow status';
  }

  return parts.slice(0, 2).map(decodeBadgeText).join(' ') || null;
}

function extractLinks(content: string): ReadmeLink[] {
  const withoutBadges = content.replace(LINKED_BADGE_PATTERN, '').replace(IMAGE_PATTERN, '');
  const links: ReadmeLink[] = [];

  for (const match of withoutBadges.matchAll(LINK_PATTERN)) {
    links.push({
      text: cleanInlineMarkdown(match[1]),
      url: match[2],
    });
  }

  return links;
}

function isLikelyBadge(alt: string, image: string): boolean {
  const url = parseUrl(image);
  return (
    url?.hostname.endsWith('shields.io') === true || /badge|build|ci|license|version/i.test(alt)
  );
}

function createUniqueSlug(title: string, usedSlugs: Map<string, number>): string {
  const base = slugify(title);
  const seen = usedSlugs.get(base) ?? 0;
  usedSlugs.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanInlineMarkdown(value: string): string {
  return value
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function cleanParagraphMarkdown(value: string): string {
  return value
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function decodeBadgeText(value: string): string {
  return decodeURIComponent(value).replace(/[-_]+/g, ' ');
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
