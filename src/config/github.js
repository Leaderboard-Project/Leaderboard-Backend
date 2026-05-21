import { Octokit } from '@octokit/rest';

export const createGitHubClient = (token) => {
  return new Octokit({
    auth: token || undefined,
    userAgent: 'github-leaderboard-platform'
  });
};
