const express = require("express");
const controller = require("../controllers/shipmentController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const rules = require("../validators");

const router = express.Router();

router.use(protect);

router.get("/", controller.listShipments);
router.post("/", authorize("admin", "staff", "customer"), validate(rules.shipment), controller.createShipment);
router.get("/:id", controller.getShipment);
router.put("/:id", authorize("admin", "staff", "customer"), validate(rules.shipment), controller.updateShipment);
router.post("/:id/cancel", authorize("admin", "staff", "customer"), controller.cancelShipment);
router.delete("/:id", authorize("admin"), controller.deleteShipment);

module.exports = router;
