import mongoose from 'mongoose';

const earnedAchievementSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Achievement'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const earnedBadgeSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Badge'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    connectedGithub: {
      type: String,
      trim: true
    },
    connectedGithubLower: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    avatarUrl: {
      type: String,
      required: true
    },
    profileUrl: {
      type: String,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    accessToken: {
      type: String,
      select: false
    },
    totalPoints: {
      type: Number,
      default: 0,
      index: true
    },
    manualPointsOverride: {
      type: Number,
      default: null
    },
    manualPointsAdjustment: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 0
    },
    badges: [earnedBadgeSchema],
    achievements: [earnedAchievementSchema],
    submissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission'
      }
    ],
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

userSchema.index({ totalPoints: -1, createdAt: 1 });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.accessToken;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('User', userSchema);
