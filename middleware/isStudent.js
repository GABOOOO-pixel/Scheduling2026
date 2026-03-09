const Student = require("../model/Student");

const isStudent = async (req, res, next) => {
  try {
    const students = await Student.find({ isArchive: false })
      .populate("sectionId")
      .sort({ createdAt: -1 })
      .lean();

    res.locals.students = students || [];
  } catch (err) {
    console.error("❌ isStudent middleware error:", err.message);
    res.locals.students = [];
  }
  next();
};

module.exports = isStudent;
