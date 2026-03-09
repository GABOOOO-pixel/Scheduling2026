const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: [true, "Section name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Section name must be at least 2 characters"],
      maxlength: [50, "Section name must not exceed 50 characters"],
      validate: {
        validator: function (v) {
          // Alphanumeric with optional hyphens and spaces (e.g. BSIT-3A, Section 1)
          return /^[a-zA-Z0-9\s\-]+$/.test(v);
        },
        message:
          "Section name may only contain letters, numbers, spaces, and hyphens",
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
    program: {
      type: String,
      required: [true, "Program is required"],
      trim: true,
      minlength: [2, "Program must be at least 2 characters"],
      maxlength: [100, "Program must not exceed 100 characters"],
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

module.exports = mongoose.model("Section", sectionSchema);