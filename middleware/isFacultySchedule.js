const Schedule = require("../model/Schedule");

const isFacultySchedule = async (req, res, next) => {
  try {
    // Only fetch if user is logged in and is faculty with a linked teacherId
    if (
      req.session &&
      req.session.user &&
      req.session.user.role === "faculty" &&
      req.session.user.teacherId
    ) {
      const facultySchedules = await Schedule.find({
        teacherId: req.session.user.teacherId,
        isArchive: false,
      })
        .populate("subjectId")
        .populate("teacherId")
        .populate("sectionId")
        .populate("roomId")
        .sort({ day: 1, timeFrom: 1 })
        .lean();

      res.locals.facultySchedules = facultySchedules || [];
    } else {
      res.locals.facultySchedules = [];
    }
  } catch (err) {
    console.error("❌ isFacultySchedule middleware error:", err.message);
    res.locals.facultySchedules = [];
  }
  next();
};

module.exports = isFacultySchedule;
