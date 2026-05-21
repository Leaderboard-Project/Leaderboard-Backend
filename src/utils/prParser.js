export const parsePullRequestUrl = (url) => {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/);

    if (!['github.com', 'www.github.com'].includes(parsed.hostname) || !match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
      prNumber: Number(match[3]),
      normalizedUrl: `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`
    };
  } catch {
    return null;
  }
};
