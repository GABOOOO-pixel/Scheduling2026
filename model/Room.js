const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
      minlength: [1, "Room number must be at least 1 character"],
      maxlength: [20, "Room number must not exceed 20 characters"],
      validate: {
        validator: function (v) {
          // Alphanumeric with optional hyphens, spaces, and dots (e.g. 101, A-101, Lab 2)
          return /^[a-zA-Z0-9\s.\-]+$/.test(v);
        },
        message:
          "Room number may only contain letters, numbers, spaces, hyphens, and dots",
      },
    },
    building: {
      type: String,
      trim: true,
      maxlength: [100, "Building name must not exceed 100 characters"],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[a-zA-Z0-9\s.\-]+$/.test(v);
        },
        message: "Building name may only contain letters, numbers, spaces, hyphens, and dots",
      },
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1"],
      max: [1000, "Capacity must not exceed 1000"],
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          return Number.isInteger(v);
        },
        message: "Capacity must be a whole number",
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

module.exports = mongoose.model("Room", roomSchema);