import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema(
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
    pointsRequired: {
      type: Number,
      default: 0
    },
    githubUrl: {
      type: String,
      trim: true
    },
    rarity: {
      type: String,
      required: true,
      enum: ['Common', 'Rare', 'Epic', 'Legendary']
    },
    autoAward: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Badge', badgeSchema);
