const router = require("express").Router();
const checkToken = require("../../middlewares/checkToken");
const analyticsController = require("./analytics.controller");

const PRIVILEGED = ["ADMIN", "MANAGER"];

router.get("/overdue", checkToken(PRIVILEGED), analyticsController.overdue);
router.get("/summary", checkToken(PRIVILEGED), analyticsController.summary);

module.exports = router;
