const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const User = require('./model/User');
const Student = require('./model/Student');
const Schedule = require('./model/Schedule');
const Subject = require('./model/Subject');
const Teacher = require('./model/Teacher');
const Section = require('./model/Section');
const Room = require('./model/Room');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// Admin/Faculty Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'User not found' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: 'Wrong password' });
        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ success: true, token, role: user.role, username: user.username });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Student Login
router.post('/student-login', async (req, res) => {
    try {
        const { studentNumber, password } = req.body;
        const student = await Student.findOne({ studentNumber });
        if (!student) return res.json({ success: false, message: 'Student not found' });
        const match = await bcrypt.compare(password, student.password);
        if (!match) return res.json({ success: false, message: 'Wrong password' });
        const token = jwt.sign(
            { id: student._id, role: 'student', studentNumber },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ success: true, token, role: 'student', username: studentNumber });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Student Schedule (FIXED - only one, no duplicate)
router.get('/student-schedule', verifyToken, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .populate('sectionId');
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const schedules = await Schedule.find({
            sectionId: student.sectionId?._id || student.sectionId,
            yearLevel: student.yearLevel,
            semester: student.semester,
            schoolYear: student.schoolYear,
            status: { $ne: 'archived' }
        })
        .populate('subjectId')
        .populate('teacherId')
        .populate('roomId')
        .populate('sectionId');
        res.json(schedules);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Schedules
router.post('/schedules', verifyToken, async (req, res) => {
    try {
        const schedule = new Schedule(req.body);
        await schedule.save();
        res.json(schedule);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/schedules/:id', verifyToken, async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id, req.body, { new: true });
        res.json(schedule);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/schedules/:id', verifyToken, async (req, res) => {
    try {
        await Schedule.findByIdAndUpdate(req.params.id, { status: 'archived' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Students
router.get('/students', verifyToken, async (req, res) => {
    try {
        const students = await Student.find().populate('sectionId');
        res.json(students);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/students', verifyToken, async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.json(student);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/students/:id', verifyToken, async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id, req.body, { new: true });
        res.json(student);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/students/:id', verifyToken, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Teachers
router.get('/teachers', verifyToken, async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.json(teachers);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/teachers', verifyToken, async (req, res) => {
    try {
        const teacher = new Teacher(req.body);
        await teacher.save();
        res.json(teacher);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Subjects
router.get('/subjects', verifyToken, async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Sections
router.get('/sections', verifyToken, async (req, res) => {
    try {
        const sections = await Section.find();
        res.json(sections);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Rooms
router.get('/rooms', verifyToken, async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Faculty Schedule
router.get('/my-schedule', verifyToken, async (req, res) => {
    try {
        const schedules = await Schedule.find({
            teacherId: req.user.id,
            status: { $ne: 'archived' }
        }).populate('subjectId').populate('sectionId').populate('roomId');
        res.json(schedules);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;