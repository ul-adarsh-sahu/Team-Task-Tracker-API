const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
};

const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
  BLOCKED: "BLOCKED",
};

const TASK_PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
};

/**
 * Allowed status transitions (server-enforced, not free-form).
 * Key = current status, Value = array of allowed next statuses.
 *
 * Flow:  TODO -> IN_PROGRESS -> IN_REVIEW -> DONE
 *        Any active state -> BLOCKED
 *        BLOCKED -> IN_PROGRESS  (re-open)
 */
const STATUS_TRANSITIONS = {
  [TASK_STATUS.TODO]:        [TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.IN_REVIEW,   TASK_STATUS.BLOCKED],
  [TASK_STATUS.IN_REVIEW]:   [TASK_STATUS.DONE,        TASK_STATUS.BLOCKED],
  [TASK_STATUS.DONE]:        [],                          // terminal state
  [TASK_STATUS.BLOCKED]:     [TASK_STATUS.IN_PROGRESS],   // can only re-open
};

module.exports = { ROLES, TASK_STATUS, TASK_PRIORITY, STATUS_TRANSITIONS };
