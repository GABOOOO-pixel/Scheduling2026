const User = require("../model/User");

const isUser = async (req, res, next) => {
  try {
    const users = await User.find({ isArchive: false })
      .select("-password")
      .populate("teacherId")
      .sort({ createdAt: -1 })
      .lean();

    res.locals.users = users || [];
  } catch (err) {
    console.error("❌ isUser middleware error:", err.message);
    res.locals.users = [];
  }
  next();
};

module.exports = isUser;
