const router = require("express").Router();
const checkToken = require("../../middlewares/checkToken");
const validate = require("../../middlewares/validate");
const authValidation = require("./auth.validation");
const authController = require("./auth.controller");

router.post("/register", validate(authValidation.register), authController.register);
router.post("/login",    validate(authValidation.login),    authController.login);
router.post("/refresh",  validate(authValidation.refresh),  authController.refresh);
router.post("/logout",   checkToken(),                      authController.logout);

module.exports = router;
