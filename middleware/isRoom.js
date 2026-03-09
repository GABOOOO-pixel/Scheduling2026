const Room = require("../model/Room");
const Schedule = require("../model/Schedule");

const isRoom = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isArchive: false })
      .sort({ roomNumber: 1 })
      .lean();

    // Attach schedule count per room for occupancy reference
    const roomIds = rooms.map((r) => r._id);
    const scheduleCounts = await Schedule.aggregate([
      {
        $match: {
          roomId: { $in: roomIds },
          isArchive: false,
          status: "active",
        },
      },
      { $group: { _id: "$roomId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    scheduleCounts.forEach((sc) => {
      countMap[sc._id.toString()] = sc.count;
    });

    rooms.forEach((r) => {
      r.scheduleCount = countMap[r._id.toString()] || 0;
    });

    res.locals.rooms = rooms || [];
  } catch (err) {
    console.error("❌ isRoom middleware error:", err.message);
    res.locals.rooms = [];
  }
  next();
};

module.exports = isRoom;
