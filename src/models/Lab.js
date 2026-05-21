import mongoose from 'mongoose';

const labSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    repoOwner: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    repoName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    githubUrl: {
      type: String,
      trim: true
    },
    icon: {
      type: String,
      trim: true,
      default: '🧪'
    },
    points: {
      type: Number,
      required: true,
      min: 1
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    deadline: Date
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

labSchema.index({ repoOwner: 1, repoName: 1 });

export default mongoose.model('Lab', labSchema);
