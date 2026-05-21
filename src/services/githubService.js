import { createGitHubClient } from '../config/github.js';
import { parsePullRequestUrl } from '../utils/prParser.js';

export const exchangeCodeForGitHubUser = async (code) => {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
    const message = tokenData.error_description || 'GitHub OAuth failed.';
    const error = new Error(message);
    error.statusCode = 401;
    throw error;
  }

  const octokit = createGitHubClient(tokenData.access_token);
  const { data: profile } = await octokit.users.getAuthenticated();

  let email = profile.email;
  if (!email) {
    const { data: emails } = await octokit.users.listEmailsForAuthenticatedUser();
    email = emails.find((item) => item.primary && item.verified)?.email || null;
  }

  return {
    accessToken: tokenData.access_token,
    githubId: String(profile.id),
    username: profile.login,
    displayName: profile.name || profile.login,
    avatarUrl: profile.avatar_url,
    profileUrl: profile.html_url,
    email
  };
};

export const validatePullRequest = async ({ prUrl, lab, username, accessToken }) => {
  const parsed = parsePullRequestUrl(prUrl);

  if (!parsed) {
    const error = new Error('Enter a valid GitHub pull request URL.');
    error.statusCode = 422;
    throw error;
  }

  const octokit = createGitHubClient(accessToken);

  let pullRequest;
  try {
    const { data } = await octokit.pulls.get({
      owner: parsed.owner,
      repo: parsed.repo,
      pull_number: parsed.prNumber
    });
    pullRequest = data;
  } catch (error) {
    if (error.status === 404) {
      const notFound = new Error('Pull request was not found on GitHub.');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }

  if (pullRequest.user?.login?.toLowerCase() !== username.toLowerCase()) {
    const error = new Error('Pull request author must match the logged-in GitHub user.');
    error.statusCode = 403;
    throw error;
  }

  const baseOwner = pullRequest.base?.repo?.owner?.login;
  const baseRepo = pullRequest.base?.repo?.name;

  if (
    baseOwner?.toLowerCase() !== lab.repoOwner.toLowerCase() ||
    baseRepo?.toLowerCase() !== lab.repoName.toLowerCase()
  ) {
    const error = new Error('Pull request does not target the selected lab repository.');
    error.statusCode = 422;
    throw error;
  }

  const isMerged = Boolean(pullRequest.merged_at);
  const status = isMerged ? 'merged' : pullRequest.state;

  if (!['open', 'closed', 'merged'].includes(status)) {
    const error = new Error('Pull request status is not eligible for scoring.');
    error.statusCode = 422;
    throw error;
  }

  return {
    parsed,
    pullRequest,
    status,
    isMerged
  };
};

export const listRepositoryPullRequests = async ({ repoOwner, repoName }) => {
  const octokit = createGitHubClient(process.env.GITHUB_TOKEN);

  try {
    const pulls = await octokit.paginate(octokit.pulls.list, {
      owner: repoOwner,
      repo: repoName,
      state: 'all',
      per_page: 100,
      sort: 'created',
      direction: 'desc'
    });

    return pulls;
  } catch (error) {
    const friendly = new Error(
      error.status === 404
        ? `GitHub repository not found: ${repoOwner}/${repoName}`
        : `GitHub sync failed for ${repoOwner}/${repoName}: ${error.message}`
    );
    friendly.statusCode = error.status === 404 ? 404 : 502;
    throw friendly;
  }
};
