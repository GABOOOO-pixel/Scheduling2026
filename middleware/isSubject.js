const Subject = require("../model/Subject");

const isSubject = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ isArchive: false })
      .sort({ subjectCode: 1 })
      .lean();

    res.locals.subjects = subjects || [];
  } catch (err) {
    console.error("❌ isSubject middleware error:", err.message);
    res.locals.subjects = [];
  }
  next();
};

module.exports = isSubject;
