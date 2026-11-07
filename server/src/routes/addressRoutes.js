const express = require("express");
const controller = require("../controllers/addressController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

// Agents see the addresses they need through their assigned shipments.
router.use(protect, authorize("admin", "staff", "customer"));

router.get("/", controller.listAddresses);
router.post("/", validate(rules.address), controller.createAddress);
router.get("/:id", controller.getAddress);
router.put("/:id", validate(rules.address), controller.updateAddress);
router.delete("/:id", controller.deleteAddress);

module.exports = router;
