async function generateNotes(pluginConfig, context) {
  const { scope, ...releaseNotesConfig } = pluginConfig;
  const { generateNotes: generateReleaseNotes } = await import(
    '@semantic-release/release-notes-generator'
  );
  const commits = context.commits.filter((commit) => getCommitScope(commit.message) === scope);

  return generateReleaseNotes(releaseNotesConfig, {
    ...context,
    commits,
  });
}

function getCommitScope(message) {
  const header = message.split(/\r?\n/, 1)[0] ?? '';
  const match = /^[a-z]+(?:\(([^)]+)\))?!?:/i.exec(header);

  return match?.[1] ?? null;
}

module.exports = {
  generateNotes,
};
