const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must not exceed 30 characters"],
      validate: {
        validator: function (v) {
          // Alphanumeric, underscores, and hyphens only
          return /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message:
          "Username may only contain letters, numbers, underscores, and hyphens",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // Note: validate password strength BEFORE hashing (in controller/middleware),
      // not here, since hashed passwords won't match plain-text rules.
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
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: ["super_admin", "admin", "faculty"],
        message: "Role must be 'super_admin', 'admin', or 'faculty'",
      },
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
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

module.exports = mongoose.model("User", userSchema);