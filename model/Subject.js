const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: [true, "Subject code is required"],
      unique: true,
      trim: true,
      minlength: [2, "Subject code must be at least 2 characters"],
      maxlength: [20, "Subject code must not exceed 20 characters"],
      validate: {
        validator: function (v) {
          // Alphanumeric with optional hyphens/spaces (e.g. CS101, IT 101, CC-101)
          return /^[a-zA-Z0-9\s-]+$/.test(v);
        },
        message:
          "Subject code may only contain letters, numbers, hyphens, and spaces",
      },
    },
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
      minlength: [3, "Subject name must be at least 3 characters"],
      maxlength: [100, "Subject name must not exceed 100 characters"],
    },
    units: {
      type: Number,
      required: [true, "Units is required"],
      min: [1, "Units must be at least 1"],
      max: [6, "Units must not exceed 6"],
      validate: {
        validator: Number.isInteger,
        message: "Units must be a whole number",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be either 'active' or 'inactive'",
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

module.exports = mongoose.model("Subject", subjectSchema);