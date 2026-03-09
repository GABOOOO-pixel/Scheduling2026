const mongoose = require("mongoose");

// Helper: convert "HH:MM" time string to minutes since midnight
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper: validate "HH:MM" 24-hour format
function isValidTime(v) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

const scheduleSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher is required"],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section is required"],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    day: {
      type: String,
      required: [true, "Day is required"],
      enum: {
        values: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        message:
          "Day must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday",
      },
    },
    timeFrom: {
      type: String,
      required: [true, "Start time is required"],
      validate: {
        validator: isValidTime,
        message: "Start time must be in 24-hour format HH:MM (e.g. 08:00, 13:30)",
      },
    },
    timeTo: {
      type: String,
      required: [true, "End time is required"],
      validate: [
        {
          validator: isValidTime,
          message: "End time must be in 24-hour format HH:MM (e.g. 08:00, 13:30)",
        },
        {
          validator: function (v) {
            if (!this.timeFrom || !isValidTime(this.timeFrom) || !isValidTime(v))
              return true; // Let the format validator handle it
            return timeToMinutes(v) > timeToMinutes(this.timeFrom);
          },
          message: "End time must be later than start time",
        },
      ],
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: [1, "Semester must be 1 or 2"],
      max: [2, "Semester must be 1 or 2"],
      validate: {
        validator: Number.isInteger,
        message: "Semester must be a whole number",
      },
    },
    schoolYear: {
      type: String,
      required: [true, "School year is required"],
      trim: true,
      validate: {
        validator: function (v) {
          if (!/^\d{4}-\d{4}$/.test(v)) return false;
          const [start, end] = v.split("-").map(Number);
          return end === start + 1;
        },
        message:
          "School year must follow the format YYYY-YYYY (e.g. 2023-2024) and be consecutive years",
      },
    },
    yearLevel: {
      type: Number,
      required: [true, "Year level is required"],
      min: [1, "Year level must be at least 1"],
      max: [5, "Year level must not exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Year level must be a whole number",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "cancelled"],
        message: "Status must be 'active', 'inactive', or 'cancelled'",
      },
      default: "active",
    },
    isArchive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Schedule", scheduleSchema);