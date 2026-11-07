const express = require("express");
const controller = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.post("/register", authLimiter, validate(rules.register), controller.register);
router.post("/login", authLimiter, validate(rules.login), controller.login);
router.post("/logout", protect, controller.logout);
router.get("/me", protect, controller.me);
router.put("/me", protect, validate(rules.updateProfile), controller.updateProfile);
router.put("/password", protect, authLimiter, validate(rules.changePassword), controller.changePassword);

module.exports = router;
