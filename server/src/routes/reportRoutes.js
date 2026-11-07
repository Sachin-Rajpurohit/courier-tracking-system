const express = require("express");
const controller = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", protect, controller.summary);

module.exports = router;
