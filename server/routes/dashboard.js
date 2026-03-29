const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Course = require('../models/Course');
const Group = require('../models/Group');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { auth, admin } = require('../middleware/auth');

// GET /api/dashboard/stats (admin)
router.get('/stats', auth, admin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'STUDENT' });
    const totalCourses = await Course.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalGroups = await Group.countDocuments();

    const submissions = await Submission.find({ status: 'COMPLETED', score: { $ne: null } });
    const avgScore = submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
      : 0;

    const completedCount = await Submission.countDocuments({ status: 'COMPLETED' });
    const overdueAssignments = await Assignment.countDocuments({ deadline: { $lt: new Date() } });

    // Recent submissions
    const recentSubmissions = await Submission.find({ status: 'COMPLETED' })
      .populate('student', 'name email')
      .populate('assignment', 'title type')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Upcoming deadlines
    const upcomingDeadlines = await Assignment.find({ deadline: { $gte: new Date() } })
      .populate('group')
      .populate('category')
      .sort({ deadline: 1 })
      .limit(10);

    res.json({
      totalStudents,
      totalCourses,
      totalAssignments,
      totalGroups,
      avgScore,
      completedCount,
      overdueAssignments,
      recentSubmissions,
      upcomingDeadlines
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/dashboard/student/:studentId (admin)
router.get('/student/:studentId', auth, admin, async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId).select('-password').populate('groups');
    if (!student) return res.status(404).json({ message: 'Студент не найден' });

    const submissions = await Submission.find({ student: req.params.studentId })
      .populate({
        path: 'assignment',
        populate: [{ path: 'theme' }, { path: 'category' }]
      })
      .sort({ submittedAt: -1 });

    const completed = submissions.filter(s => s.status === 'COMPLETED');
    const avgScore = completed.length > 0
      ? Math.round(completed.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / completed.filter(s => s.score !== null).length)
      : 0;

    res.json({ student, submissions, avgScore });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/dashboard/group/:groupId (admin)
router.get('/group/:groupId', auth, admin, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('course');
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });

    const students = await User.find({ groups: req.params.groupId, role: 'STUDENT' }).select('-password');
    const assignments = await Assignment.find({ group: req.params.groupId }).populate('category');

    const studentStats = await Promise.all(students.map(async (student) => {
      const submissions = await Submission.find({ student: student._id, assignment: { $in: assignments.map(a => a._id) } });
      const completed = submissions.filter(s => s.status === 'COMPLETED');
      const graded = completed.filter(s => s.score !== null);
      const avgScore = graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + s.score, 0) / graded.length)
        : 0;
      return {
        student: { _id: student._id, name: student.name, email: student.email, lastLogin: student.lastLogin },
        totalAssignments: assignments.length,
        completedCount: completed.length,
        avgScore
      };
    }));

    const groupAvg = studentStats.length > 0
      ? Math.round(studentStats.reduce((sum, s) => sum + s.avgScore, 0) / studentStats.length)
      : 0;

    res.json({ group, assignments, studentStats, groupAvg });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/dashboard/export/:groupId (admin - export to Excel)
router.get('/export/:groupId', auth, admin, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('course');
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });

    const students = await User.find({ groups: req.params.groupId, role: 'STUDENT' }).select('-password').sort({ name: 1 });
    const assignments = await Assignment.find({ group: req.params.groupId }).populate('category').sort({ deadline: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Оценки');

    // Header row
    const headers = ['Студент', 'Email'];
    assignments.forEach(a => headers.push(a.title));
    headers.push('Средний балл');

    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data rows
    for (const student of students) {
      const row = [student.name, student.email];
      let total = 0;
      let count = 0;

      for (const assignment of assignments) {
        const submission = await Submission.findOne({ student: student._id, assignment: assignment._id });
        if (submission && submission.score !== null) {
          row.push(submission.score);
          total += submission.score;
          count++;
        } else if (submission) {
          row.push(submission.status === 'COMPLETED' ? 'Не оценено' : submission.status);
        } else {
          row.push('—');
        }
      }

      row.push(count > 0 ? Math.round(total / count) : 0);
      sheet.addRow(row);
    }

    // Auto width
    sheet.columns.forEach(col => { col.width = 20; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=grades_${group.name}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
