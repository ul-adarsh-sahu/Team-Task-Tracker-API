const Task = require("../../models/task.model");

/**
 * GET /analytics/overdue
 * Tasks past due_date that are not DONE, grouped by assignee.
 * ADMIN + MANAGER only.
 */
const getOverdue = async ({ organizationId }) => {
  const now = new Date();

  const rows = await Task.aggregate([
    {
      $match: {
        organizationId: require("mongoose").Types.ObjectId.createFromHexString
          ? require("mongoose").Types.ObjectId.createFromHexString(String(organizationId))
          : new (require("mongoose").Types.ObjectId)(String(organizationId)),
        due_date: { $lt: now },
        status: { $nin: ["DONE"] },
      },
    },
    {
      $group: {
        _id: "$assigneeId",
        overdueCount: { $sum: 1 },
        tasks: {
          $push: {
            _id: "$_id",
            title: "$title",
            status: "$status",
            priority: "$priority",
            due_date: "$due_date",
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "assignee",
      },
    },
    {
      $project: {
        _id: 0,
        assignee: { $arrayElemAt: ["$assignee", 0] },
        overdueCount: 1,
        tasks: 1,
      },
    },
    {
      $project: {
        "assignee.password": 0,
        "assignee.refreshToken": 0,
      },
    },
    { $sort: { overdueCount: -1 } },
  ]);

  return {
    status: 200,
    message: "Overdue tasks fetched",
    data: {
      totalOverdue: rows.reduce((sum, r) => sum + r.overdueCount, 0),
      byAssignee: rows,
    },
  };
};

/**
 * GET /analytics/summary
 * Org-wide stats: task counts by status, avg completion time (hours),
 * and top contributors (most tasks completed).
 * ADMIN + MANAGER only.
 */
const getSummary = async ({ organizationId }) => {
  const mongoose = require("mongoose");
  const orgObjectId = mongoose.Types.ObjectId.createFromHexString
    ? mongoose.Types.ObjectId.createFromHexString(String(organizationId))
    : new mongoose.Types.ObjectId(String(organizationId));

  const [statusCounts, completionStats] = await Promise.all([
    // Count by status
    Task.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Avg completion time for DONE tasks (createdAt → completedAt, in hours)
    Task.aggregate([
      {
        $match: {
          organizationId: orgObjectId,
          status: "DONE",
          completedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: {
            $avg: {
              $divide: [
                { $subtract: ["$completedAt", "$createdAt"] },
                1000 * 60 * 60, // ms → hours
              ],
            },
          },
          completedCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byStatus = {};
  for (const row of statusCounts) byStatus[row._id] = row.count;

  const completion = completionStats[0] || { avgHours: null, completedCount: 0 };

  return {
    status: 200,
    message: "Analytics summary fetched",
    data: {
      tasksByStatus: byStatus,
      completedTasks: completion.completedCount,
      avgCompletionTimeHours:
        completion.avgHours !== null
          ? Math.round(completion.avgHours * 100) / 100
          : null,
    },
  };
};

module.exports = { getOverdue, getSummary };
