const router = require("express").Router();
const checkToken = require("../../middlewares/checkToken");
const validate = require("../../middlewares/validate");
const userValidation = require("./user.validation");
const userController = require("./user.controller");

// All user management is ADMIN only
router.get("/",       checkToken(["ADMIN"]), userController.getUsers);
router.get("/:id",    checkToken(["ADMIN"]), userController.getUserById);
router.patch("/:id/role", checkToken(["ADMIN"]), validate(userValidation.updateRole), userController.updateRole);
router.delete("/:id", checkToken(["ADMIN"]), userController.deleteUser);

module.exports = router;
