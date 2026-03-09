const Teacher = require("../model/Teacher");
const Schedule = require("../model/Schedule");

const isTeacher = async (req, res, next) => {
  try {
    const teachers = await Teacher.find({ isArchive: false })
      .sort({ lname: 1 })
      .lean();

    // Attach schedule count per teacher for quick reference
    const teacherIds = teachers.map((t) => t._id);
    const scheduleCounts = await Schedule.aggregate([
      {
        $match: {
          teacherId: { $in: teacherIds },
          isArchive: false,
          status: "active",
        },
      },
      { $group: { _id: "$teacherId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    scheduleCounts.forEach((sc) => {
      countMap[sc._id.toString()] = sc.count;
    });

    teachers.forEach((t) => {
      t.scheduleCount = countMap[t._id.toString()] || 0;
    });

    res.locals.teachers = teachers || [];
  } catch (err) {
    console.error("❌ isTeacher middleware error:", err.message);
    res.locals.teachers = [];
  }
  next();
};

module.exports = isTeacher;
