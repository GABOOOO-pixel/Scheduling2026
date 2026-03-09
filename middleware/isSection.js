const Section = require("../model/Section");
const Student = require("../model/Student");

const isSection = async (req, res, next) => {
  try {
    const sections = await Section.find({ isArchive: false })
      .sort({ yearLevel: 1, sectionName: 1 })
      .lean();

    // Attach student count per section
    const sectionIds = sections.map((s) => s._id);
    const studentCounts = await Student.aggregate([
      {
        $match: {
          sectionId: { $in: sectionIds },
          isArchive: false,
          status: "active",
        },
      },
      { $group: { _id: "$sectionId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    studentCounts.forEach((sc) => {
      countMap[sc._id.toString()] = sc.count;
    });

    sections.forEach((s) => {
      s.studentCount = countMap[s._id.toString()] || 0;
    });

    res.locals.sections = sections || [];
  } catch (err) {
    console.error("❌ isSection middleware error:", err.message);
    res.locals.sections = [];
  }
  next();
};

module.exports = isSection;
