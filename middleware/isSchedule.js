const Schedule = require("../model/Schedule");

const isSchedule = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ isArchive: false })
      .populate("subjectId")
      .populate("teacherId")
      .populate("sectionId")
      .populate("roomId")
      .sort({ createdAt: -1 })
      .lean();

    res.locals.schedules = schedules || [];
  } catch (err) {
    console.error("❌ isSchedule middleware error:", err.message);
    res.locals.schedules = [];
  }
  next();
};

module.exports = isSchedule;
