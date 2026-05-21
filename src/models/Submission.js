import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    labId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: true,
      index: true
    },
    prUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    prNumber: {
      type: Number,
      required: true
    },
    repoOwner: {
      type: String,
      required: true,
      index: true
    },
    repoName: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'merged'],
      required: true
    },
    isMerged: {
      type: Boolean,
      default: false
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedAt: Date,
    reviewedBy: {
      type: String,
      trim: true
    },
    pointsAwarded: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, labId: 1 });
submissionSchema.index({ reviewStatus: 1, submittedAt: -1 });
submissionSchema.index({ repoOwner: 1, repoName: 1, prNumber: 1 }, { unique: true });

export default mongoose.model('Submission', submissionSchema);
