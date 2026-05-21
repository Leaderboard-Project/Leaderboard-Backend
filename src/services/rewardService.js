import Achievement from '../models/Achievement.js';
import Badge from '../models/Badge.js';
import '../models/Lab.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const hasItem = (items, id) => items.some((entry) => String(entry.item) === String(id));

export const recalculateRanks = async () => {
  const users = await User.find({}).select('_id displayName username totalPoints');
  users.sort((a, b) => {
    if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    }

    return (a.displayName || a.username || '').localeCompare(
      b.displayName || b.username || '',
      undefined,
      { sensitivity: 'base' }
    );
  });

  await Promise.all(
    users.map((user, index) =>
      User.updateOne({ _id: user._id }, { $set: { rank: index + 1 } })
    )
  );
};

export const recalculateUserTotalPoints = async (userId) => {
  const user = await User.findById(userId).populate('badges.item');

  if (!user) return null;
  const earnedPoints = await calculateUserEarnedPoints(user);

  user.totalPoints = Math.max(earnedPoints + (user.manualPointsAdjustment || 0), 0);
  await user.save();

  return user.totalPoints;
};

export const calculateUserEarnedPoints = async (userOrId) => {
  const user =
    typeof userOrId === 'object' && Array.isArray(userOrId.badges)
      ? userOrId
      : await User.findById(userOrId).populate('badges.item');

  if (!user) return 0;
  const submissions = await Submission.find({
    userId: user._id,
    reviewStatus: 'approved'
  }).populate('labId', 'points');

  const labPoints = submissions.reduce(
    (sum, submission) => sum + (submission.pointsAwarded || submission.labId?.points || 0),
    0
  );
  const sideQuestPoints = (user.badges || []).reduce(
    (sum, badge) => sum + (badge.item?.pointsRequired || 0),
    0
  );

  return labPoints + sideQuestPoints;
};

export const recalculateAllUserTotals = async () => {
  const users = await User.find({}).select('_id');

  for (const user of users) {
    await recalculateUserTotalPoints(user._id);
  }

  await recalculateRanks();
};

export const unlockRewards = async (user) => {
  const achievements = await Achievement.find({});
  const badges = await Badge.find({});
  const unlockedAchievements = [];
  const unlockedBadges = [];
  const completedLabs = user.submissions.length;

  const achievementChecks = {
    FIRST_PR: completedLabs >= 1,
    FIVE_LABS: completedLabs >= 5,
    TEN_LABS: completedLabs >= 10,
    PERFECT_STREAK: completedLabs >= 7,
    FAST_FINISHER: completedLabs >= 1,
    TOP_3: user.rank > 0 && user.rank <= 3,
    OPEN_SOURCE_WARRIOR: user.totalPoints >= 500,
    CONSISTENT_CODER: completedLabs >= 3,
    BUG_HUNTER: completedLabs >= 2,
    GITHUB_MASTER: user.totalPoints >= 1000
  };

  achievements.forEach((achievement) => {
    const meetsCondition =
      achievementChecks[achievement.condition] ||
      (achievement.pointsRequired > 0 && user.totalPoints >= achievement.pointsRequired);

    if (meetsCondition && !hasItem(user.achievements, achievement._id)) {
      user.achievements.push({ item: achievement._id });
      unlockedAchievements.push(achievement);
    }
  });

  badges.filter((badge) => badge.autoAward).forEach((badge) => {
    const thresholds = {
      Common: 1,
      Rare: 250,
      Epic: 600,
      Legendary: 1000
    };
    const threshold = badge.pointsRequired || thresholds[badge.rarity] || 0;

    if (user.totalPoints >= threshold && !hasItem(user.badges, badge._id)) {
      user.badges.push({ item: badge._id });
      unlockedBadges.push(badge);
    }
  });

  await user.save();

  return {
    unlockedAchievements,
    unlockedBadges
  };
};
