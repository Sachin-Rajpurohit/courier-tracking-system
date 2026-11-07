const express = require("express");
const controller = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin", "staff", "agent"), controller.listAssignments);
router.post("/", authorize("admin", "staff"), validate(rules.createAssignment), controller.createAssignment);
router.get("/:id", authorize("admin", "staff", "agent"), controller.getAssignment);
router.put("/:id", authorize("admin", "staff"), validate(rules.updateAssignment), controller.updateAssignment);
router.delete("/:id", authorize("admin"), controller.deleteAssignment);

module.exports = router;
