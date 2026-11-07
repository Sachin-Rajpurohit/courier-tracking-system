const { Shipment, DeliveryAttempt } = require("../models");
const { SHIPMENT_STATUSES, TERMINAL_STATUSES } = require("../models/constants");
const { isManager, shipmentScope } = require("../utils/access");

const DAYS = 7;

async function summary(req, res) {
  // Admin and staff see everything; agents and customers only see their own shipments.
  const scope = shipmentScope(req.user);

  const byStatus = [];
  for (const status of SHIPMENT_STATUSES) {
    byStatus.push({ status, count: await Shipment.countDocuments({ ...scope, status }) });
  }

  const totals = {
    shipments: await Shipment.countDocuments(scope),
    open: await Shipment.countDocuments({ ...scope, status: { $nin: TERMINAL_STATUSES } }),
    delivered: await Shipment.countDocuments({ ...scope, status: "delivered" }),
    failed: await Shipment.countDocuments({ ...scope, status: "failed_attempt" }),
  };

  // One row per day, oldest first.
  const daily = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    daily.push({
      date: start,
      created: await Shipment.countDocuments({ ...scope, createdAt: { $gte: start, $lt: end } }),
      delivered: await Shipment.countDocuments({ ...scope, deliveredAt: { $gte: start, $lt: end } }),
    });
  }

  const report = { totals, byStatus, daily };

  // Groups attempts by agent, then adds each agent's name from the users collection.
  if (isManager(req.user)) {
    report.agentPerformance = await DeliveryAttempt.aggregate([
      {
        $group: {
          _id: "$agent",
          delivered: { $sum: { $cond: [{ $eq: ["$outcome", "delivered"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$outcome", "failed"] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agent" } },
      { $unwind: "$agent" },
      { $project: { name: "$agent.name", delivered: 1, failed: 1 } },
      { $sort: { delivered: -1 } },
    ]);
  }

  res.json(report);
}

module.exports = { summary };
