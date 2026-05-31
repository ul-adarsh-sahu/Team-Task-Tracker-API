const router = require("express").Router();
const checkToken = require("../../middlewares/checkToken");
const validate = require("../../middlewares/validate");
const projectValidation = require("./project.validation");
const projectController = require("./project.controller");

const ALL_ROLES = ["ADMIN", "MANAGER", "MEMBER"];
const PRIVILEGED = ["ADMIN", "MANAGER"];

router.post("/",    checkToken(PRIVILEGED), validate(projectValidation.create), projectController.create);
router.get("/",     checkToken(ALL_ROLES),  projectController.getAll);
router.get("/:id",  checkToken(ALL_ROLES),  projectController.getById);
router.put("/:id",  checkToken(PRIVILEGED), validate(projectValidation.update), projectController.update);
router.delete("/:id", checkToken(PRIVILEGED), projectController.remove);

module.exports = router;
