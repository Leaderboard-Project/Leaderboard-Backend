import User from '../models/User.js';
import { seedStudents } from '../data/students.js';
import { recalculateRanks } from './rewardService.js';

const githubAvatarUrl = (username) => `https://github.com/${username}.png`;
const githubProfileUrl = (username) => `https://github.com/${username}`;
const syntheticGithubId = (studentId) => `seed:${studentId}`;
const hasLocalAvatar = (avatar) => Boolean(avatar && avatar !== 'avatars/default.png');

const studentPayload = (student) => ({
  studentId: student.id,
  username: student.connectedGithub,
  displayName: student.name,
  connectedGithub: student.connectedGithub,
  connectedGithubLower: student.connectedGithub.toLowerCase(),
  avatarUrl: hasLocalAvatar(student.avatar) ? student.avatar : githubAvatarUrl(student.connectedGithub),
  profileUrl: githubProfileUrl(student.connectedGithub)
});

export const findUserByConnectedGithub = (username) => {
  if (!username) return null;
  return User.findOne({ connectedGithubLower: username.toLowerCase() });
};

export const ensureSeedStudents = async () => {
  for (const student of seedStudents) {
    const payload = studentPayload(student);
    const existing = await User.findOne({
      $or: [
        { studentId: student.id },
        { connectedGithubLower: payload.connectedGithubLower },
        { username: student.connectedGithub }
      ]
    });

    if (existing) {
      existing.studentId = payload.studentId;
      existing.username = payload.username;
      existing.displayName = payload.displayName;
      existing.connectedGithub = payload.connectedGithub;
      existing.connectedGithubLower = payload.connectedGithubLower;
      existing.profileUrl = existing.profileUrl || payload.profileUrl;
      existing.githubId = existing.githubId || syntheticGithubId(student.id);
      existing.avatarUrl = hasLocalAvatar(student.avatar) ? student.avatar : payload.avatarUrl;
      await existing.save();
      continue;
    }

    await User.create({
      githubId: syntheticGithubId(student.id),
      ...payload,
      totalPoints: 0
    });
  }

  await recalculateRanks();
};
