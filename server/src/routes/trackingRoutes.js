const express = require("express");
const controller = require("../controllers/trackingController");
const { trackingLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/:trackingNumber", trackingLimiter, controller.trackShipment);

module.exports = router;
