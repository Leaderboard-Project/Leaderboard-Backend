import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { setAuthCookie, signToken } from '../utils/token.js';
import { exchangeCodeForGitHubUser } from '../services/githubService.js';
import { findUserByConnectedGithub } from '../services/studentSeedService.js';

const adminUsernames = () =>
  (process.env.ADMIN_GITHUB_USERNAMES || '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

export const githubLogin = asyncHandler(async (req, res) => {
  const githubUser = await exchangeCodeForGitHubUser(req.body.code);
  const seededUser = await findUserByConnectedGithub(githubUser.username);
  const localAvatar = seededUser?.avatarUrl?.startsWith('avatars/');

  const user = await User.findOneAndUpdate(
    seededUser ? { _id: seededUser._id } : { githubId: githubUser.githubId },
    {
      $set: {
        githubId: githubUser.githubId,
        username: githubUser.username,
        displayName: seededUser?.displayName || githubUser.displayName,
        connectedGithub: githubUser.username,
        connectedGithubLower: githubUser.username.toLowerCase(),
        avatarUrl: localAvatar ? seededUser.avatarUrl : githubUser.avatarUrl,
        profileUrl: githubUser.profileUrl,
        email: githubUser.email,
        accessToken: githubUser.accessToken,
        isAdmin: adminUsernames().includes(githubUser.username.toLowerCase())
      }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select('+accessToken');

  const token = signToken(user);
  setAuthCookie(res, token);

  res.json({ token, user });
});

export const me = asyncHandler(async (req, res) => {
  await req.user.populate(['badges.item', 'achievements.item', 'submissions']);
  res.json({ user: req.user });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out.' });
});
