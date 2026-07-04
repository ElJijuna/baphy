export interface CodeownersRule {
  /** Path pattern exactly as it appears in the file. */
  pattern: string;
  /** Owners assigned to the pattern: @user, @org/team, or email. Empty means unowned. */
  owners: string[];
  /** 1-indexed line number of the rule in the file. */
  lineNumber: number;
  /** GitLab-style section the rule belongs to, or null in plain GitHub files. */
  section: string | null;
}

/** Matches a GitLab section header: [Section], ^[Optional], [Docs][2]. */
const SECTION_PATTERN = /^\^?\[([^\]]+)\](?:\[\d+\])?/;

/**
 * Parses CODEOWNERS file contents into an ordered list of rules.
 *
 * Blank lines and comment lines are skipped. GitLab-style section headers
 * assign their name to the rules below them; rules without owners inherit
 * the section's default owners when the header declares any.
 *
 * @param content Full CODEOWNERS file contents.
 * @returns Rules in file order — order matters, the last match wins.
 */
export function parseCodeowners(content: string): CodeownersRule[] {
  const rules: CodeownersRule[] = [];
  const lines = content.split(/\r?\n/);

  let section: string | null = null;
  let sectionOwners: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const sectionMatch = line.match(SECTION_PATTERN);

    if (sectionMatch) {
      section = sectionMatch[1].trim();
      sectionOwners = tokenize(line.slice(sectionMatch[0].length));
      continue;
    }

    const [pattern, ...owners] = tokenize(line);

    if (!pattern) {
      continue;
    }

    rules.push({
      pattern,
      owners: owners.length > 0 ? owners : [...sectionOwners],
      lineNumber: index + 1,
      section,
    });
  }

  return rules;
}

/**
 * Resolves which rule owns a path, using GitHub semantics: the last
 * matching rule in file order wins.
 *
 * @param rules Rules from {@link parseCodeowners}.
 * @param filePath Repo-relative path, without a leading slash.
 * @returns The winning rule, or null when no pattern matches.
 */
export function matchCodeowners(rules: CodeownersRule[], filePath: string): CodeownersRule | null {
  const path = filePath.replace(/^\//, '');

  for (let index = rules.length - 1; index >= 0; index -= 1) {
    if (compilePattern(rules[index].pattern).test(path)) {
      return rules[index];
    }
  }

  return null;
}

const patternCache = new Map<string, RegExp>();

function compilePattern(pattern: string): RegExp {
  const cached = patternCache.get(pattern);

  if (cached) {
    return cached;
  }

  const compiled = patternToRegExp(pattern);

  patternCache.set(pattern, compiled);

  return compiled;
}

/**
 * Translates a CODEOWNERS pattern (gitignore-style) into a RegExp:
 * - a slash anywhere but the end anchors the pattern to the repo root
 * - a trailing slash matches everything inside the directory
 * - `*` and `?` never cross a slash; `**` does
 * - unlike gitignore, a trailing wildcard segment such as `docs/*` matches
 *   only direct children, not deeper paths (GitHub CODEOWNERS behavior)
 */
function patternToRegExp(pattern: string): RegExp {
  let rest = pattern;

  const dirOnly = rest.endsWith('/');

  if (dirOnly) {
    rest = rest.slice(0, -1);
  }

  const anchored = rest.includes('/');

  if (rest.startsWith('/')) {
    rest = rest.slice(1);
  }

  const segments = rest.split('/');

  let source = '';

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];

    if (segment === '**') {
      source += index === segments.length - 1 ? '.*' : '(?:[^/]+/)*';
      continue;
    }

    source += translateSegment(segment);

    if (index < segments.length - 1) {
      source += '/';
    }
  }

  const lastSegment = segments[segments.length - 1];
  const suffix = dirOnly ? '/' : /[*?]/.test(lastSegment) ? '$' : '(?:$|/)';
  const prefix = anchored ? '^' : '(?:^|/)';

  return new RegExp(prefix + source + suffix);
}

function translateSegment(segment: string): string {
  let source = '';

  for (const char of segment) {
    if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/, '\\$&');
    }
  }

  return source;
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];

  let current = '';

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '\\' && line[index + 1] === ' ') {
      current += ' ';
      index += 1;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else if (char === '#') {
      // Inline comment: the rest of the line is ignored.
      break;
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
