const mongoose = require("mongoose");
const { TASK_STATUS, TASK_PRIORITY } = require("../utility/constants");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    due_date: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Set when task moves to DONE — used for avg completion time analytics
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes on frequently queried fields
taskSchema.index({ status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ organizationId: 1, status: 1 });
taskSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model("Task", taskSchema);
