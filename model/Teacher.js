const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must not exceed 50 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/.test(v);
        },
        message: "First name must contain letters only",
      },
    },
    mname: {
      type: String,
      trim: true,
      maxlength: [50, "Middle name must not exceed 50 characters"],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/.test(v);
        },
        message: "Middle name must contain letters only",
      },
    },
    lname: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name must not exceed 50 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/.test(v);
        },
        message: "Last name must contain letters only",
      },
    },
    suffix: {
      type: String,
      trim: true,
      maxlength: [10, "Suffix must not exceed 10 characters"],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[a-zA-Z.]+$/.test(v);
        },
        message: "Suffix must contain letters only (e.g. Jr., Sr., III)",
      },
    },
    department: {
      type: String,
      default: "CIT",
      trim: true,
      maxlength: [100, "Department must not exceed 100 characters"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    contact: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^(09|\+639)\d{9}$/.test(v);
        },
        message:
          "Contact number must be a valid PH number (e.g. 09XXXXXXXXX or +639XXXXXXXXX)",
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

module.exports = mongoose.model("Teacher", teacherSchema);