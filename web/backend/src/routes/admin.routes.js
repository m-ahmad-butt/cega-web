const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG/PNG/WebP images allowed'));
  },
});

// Dashboard
router.get('/dashboard/stats', requireAdmin, adminController.getDashboardStats);

// Branches
router.get('/branches', requireAdmin, adminController.listBranches);
router.post('/branches', requireAdmin, adminController.createBranch);
router.get('/branches/:id', requireAdmin, adminController.getBranch);
router.put('/branches/:id', requireAdmin, adminController.updateBranch);
router.delete('/branches/:id', requireAdmin, adminController.deleteBranch);

// Courses
router.get('/courses', requireAdmin, adminController.listCourses);
router.post('/courses', requireAdmin, adminController.createCourse);
router.get('/courses/:id', requireAdmin, adminController.getCourse);
router.put('/courses/:id', requireAdmin, adminController.updateCourse);
router.delete('/courses/:id', requireAdmin, adminController.deleteCourse);

// Students
router.get('/students', requireAdmin, adminController.listStudents);
router.post('/students/ocr-cnic', requireAdmin, upload.single('cnic'), adminController.ocrCnic);
router.post('/students', requireAdmin, adminController.createStudent);
router.get('/students/:id', requireAdmin, adminController.getStudent);
router.put('/students/:id', requireAdmin, adminController.updateStudent);
router.delete('/students/:id', requireAdmin, adminController.deleteStudent);

// Course Assignments
router.get('/students/:id/assignments', requireAdmin, adminController.getStudentAssignments);
router.post('/assignments', requireAdmin, adminController.assignCourse);
router.post('/assignments/bulk', requireAdmin, adminController.bulkAssignCourses);
router.delete('/assignments/:id', requireAdmin, adminController.removeAssignment);

// Exam Slots
router.get('/slots', requireAdmin, adminController.listSlots);
router.post('/slots', requireAdmin, adminController.createSlot);
router.put('/slots/:id', requireAdmin, adminController.updateSlot);
router.delete('/slots/:id', requireAdmin, adminController.deleteSlot);

// Change Requests
router.get('/requests', requireAdmin, adminController.listRequests);
router.patch('/requests/:id', requireAdmin, adminController.handleRequest);

module.exports = router;
