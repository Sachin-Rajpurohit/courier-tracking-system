const express = require("express");
const controller = require("../controllers/deliveryAttemptController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin", "staff", "agent"), controller.listAttempts);
router.post("/", authorize("admin", "staff", "agent"), validate(rules.createAttempt), controller.createAttempt);
router.get("/:id", authorize("admin", "staff", "agent"), controller.getAttempt);
router.put("/:id", authorize("admin", "staff", "agent"), validate(rules.updateAttempt), controller.updateAttempt);
router.delete("/:id", authorize("admin"), controller.deleteAttempt);

module.exports = router;
