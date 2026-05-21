import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      required: true
    },
    condition: {
      type: String,
      required: true,
      enum: [
        'FIRST_PR',
        'FIVE_LABS',
        'TEN_LABS',
        'PERFECT_STREAK',
        'FAST_FINISHER',
        'TOP_3',
        'OPEN_SOURCE_WARRIOR',
        'CONSISTENT_CODER',
        'BUG_HUNTER',
        'GITHUB_MASTER'
      ]
    },
    pointsRequired: {
      type: Number,
      default: 0
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Achievement', achievementSchema);
