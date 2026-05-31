const router = require("express").Router({ mergeParams: true });

router.use("/auth", require("./auth/auth.router"));

module.exports = router;
