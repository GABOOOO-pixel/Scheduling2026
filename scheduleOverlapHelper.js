// =============================================
// checkScheduleOverlap
// Checks if a new schedule conflicts with existing ones
// Checks 3 types of conflicts:
//   1. Same teacher — same day & time
//   2. Same section — same day & time
//   3. Same room — same day & time
// =============================================

const Schedule = require('./model/Schedule');

// Convert "HH:MM" to minutes
const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const checkOverlap = async ({ subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, semester, schoolYear, excludeId = null }) => {

  const fromMin = toMinutes(timeFrom);
  const toMin   = toMinutes(timeTo);

  // Base query — same day, semester, schoolYear, not archived
  const baseQuery = {
    day,
    semester: Number(semester),
    schoolYear,
    isArchive: false,
    status: { $ne: 'cancelled' },
  };

  // Exclude current schedule when editing
  if (excludeId) {
    baseQuery._id = { $ne: excludeId };
  }

  // Get all schedules on same day/sem/sy
  const existing = await Schedule.find(baseQuery).lean();

  const conflicts = [];

  for (const sched of existing) {
    const existFrom = toMinutes(sched.timeFrom);
    const existTo   = toMinutes(sched.timeTo);

    // Check time overlap
    const overlaps = fromMin < existTo && toMin > existFrom;
    if (!overlaps) continue;

    // Check conflict type
    if (sched.teacherId?.toString() === teacherId?.toString()) {
      conflicts.push(`Teacher is already assigned to another class at this time (${sched.timeFrom} - ${sched.timeTo}).`);
    }
    if (sched.sectionId?.toString() === sectionId?.toString()) {
      conflicts.push(`Section already has a class scheduled at this time (${sched.timeFrom} - ${sched.timeTo}).`);
    }
    if (roomId && sched.roomId?.toString() === roomId?.toString()) {
      conflicts.push(`Room is already in use at this time (${sched.timeFrom} - ${sched.timeTo}).`);
    }
  }

  return [...new Set(conflicts)]; // remove duplicates
};

module.exports = { checkOverlap };
