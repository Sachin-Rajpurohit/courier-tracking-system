const express = require("express");
const controller = require("../controllers/trackingEventController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.use(protect);

router.get("/", controller.listEvents);
router.post("/", authorize("admin", "staff", "agent"), validate(rules.createEvent), controller.createEvent);
router.get("/:id", controller.getEvent);
router.put("/:id", authorize("admin", "staff", "agent"), validate(rules.updateEvent), controller.updateEvent);
router.delete("/:id", authorize("admin", "staff"), controller.deleteEvent);

module.exports = router;
