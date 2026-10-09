const express = require('express');
const studentController = require('../controllers/student.controller');

const router = express.Router();

const requireStudent = (req, res, next) => {
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ message: 'Student access required' });
  }
  next();
};

router.get('/profile', requireStudent, studentController.getProfile);
router.get('/branches', requireStudent, studentController.getBranches);
router.post('/select-branch', requireStudent, studentController.selectBranch);
router.get('/assigned-courses', requireStudent, studentController.getAssignedCourses);
router.post('/save-datesheet', requireStudent, studentController.saveDateSheet);
router.get('/datesheet', requireStudent, studentController.getDateSheet);
router.get('/datesheet/pdf', requireStudent, studentController.downloadDateSheet);
router.post('/requests', requireStudent, studentController.createRequest);
router.get('/requests', requireStudent, studentController.getMyRequests);

router.post('/agent/chat', requireStudent, studentController.agentChat);
router.post('/agent/apply', requireStudent, studentController.agentApply);
router.post('/agent/reset', requireStudent, studentController.agentReset);

module.exports = router;
