const router = require("express").Router({ mergeParams: true });

router.use("/auth",     require("./auth/auth.router"));
router.use("/users",    require("./user/user.router"));
router.use("/projects", require("./project/project.router"));

module.exports = router;
