const express = require("express");
const controller = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.use(protect);

router.get("/", authorize("admin", "staff"), controller.listUsers);
router.post("/", authorize("admin", "staff"), validate(rules.createUser), controller.createUser);
router.get("/:id", authorize("admin", "staff"), controller.getUser);
router.put("/:id", authorize("admin"), validate(rules.updateUser), controller.updateUser);
router.delete("/:id", authorize("admin"), controller.deleteUser);

module.exports = router;
