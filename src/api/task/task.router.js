const router = require("express").Router();
const checkToken = require("../../middlewares/checkToken");
const validate = require("../../middlewares/validate");
const taskValidation = require("./task.validation");
const taskController = require("./task.controller");

const ALL_ROLES  = ["ADMIN", "MANAGER", "MEMBER"];
const PRIVILEGED = ["ADMIN", "MANAGER"];

// List & create
router.get("/",    checkToken(ALL_ROLES),  validate(taskValidation.listQuery, "query"), taskController.getAll);
router.post("/",   checkToken(PRIVILEGED), validate(taskValidation.create),             taskController.create);

// Single task
router.get("/:id",           checkToken(ALL_ROLES),  taskController.getById);
router.put("/:id",           checkToken(ALL_ROLES),  validate(taskValidation.update), taskController.update);
router.patch("/:id/status",  checkToken(ALL_ROLES),  validate(taskValidation.updateStatus), taskController.updateStatus);
router.delete("/:id",        checkToken(PRIVILEGED), taskController.remove);

module.exports = router;
