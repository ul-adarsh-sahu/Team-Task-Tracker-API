const router = require("express").Router({ mergeParams: true });

router.use("/auth",      require("./auth/auth.router"));
router.use("/users",     require("./user/user.router"));
router.use("/projects",  require("./project/project.router"));
router.use("/tasks",     require("./task/task.router"));
router.use("/analytics", require("./analytics/analytics.router"));

module.exports = router;
