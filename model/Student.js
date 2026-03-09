const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentNumber: {
      type: String,
      required: [true, "Student number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{2}-\d{4}-\d{6}$/.test(v);
        },
        message: "Student number must follow the format 00-0000-000000",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
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
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      minlength: [5, "Address must be at least 5 characters"],
      maxlength: [200, "Address must not exceed 200 characters"],
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^(09|\+639)\d{9}$/.test(v);
        },
        message:
          "Contact number must be a valid PH number (e.g. 09XXXXXXXXX or +639XXXXXXXXX)",
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
    studentType: {
      type: String,
      required: [true, "Student type is required"],
      enum: {
        values: ["regular", "irregular"],
        message: "Student type must be either 'regular' or 'irregular'",
      },
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
        message: "School year must follow the format YYYY-YYYY (e.g. 2023-2024) and be consecutive years",
      },
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
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

module.exports = mongoose.model("Student", studentSchema);
