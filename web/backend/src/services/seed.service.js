const bcrypt = require('bcryptjs');
const { User, Branch, Course, CourseAssignment, ExamSlot } = require('../models');

const seedAdmin = async () => {
  const email = 'admin@vu.edu.pk';
  const hashed = await bcrypt.hash('demo', 10);
  const existing = await User.findOne({
    $or: [{ email }, { email: 'admin@examslot.com' }, { role: 'ADMIN' }],
  });

  if (existing) {
    existing.email = email;
    existing.fullName = existing.fullName || 'VU Admin';
    existing.password = hashed;
    existing.role = 'ADMIN';
    existing.isVerified = true;
    await existing.save();
  } else {
    await User.create({
      email,
      fullName: 'VU Admin',
      password: hashed,
      role: 'ADMIN',
      isVerified: true,
    });
  }
  console.log(`[SEED] Admin ensured: ${email}`);
};

const seedBranches = async () => {
  const branches = [
    { code: 'LHR', name: 'Lahore Branch', city: 'Lahore', address: 'Main Boulevard, Gulberg III, Lahore', contactNumber: '042-35761234', status: 'active' },
    { code: 'ISB', name: 'Islamabad Branch', city: 'Islamabad', address: 'Sector H-9, Islamabad', contactNumber: '051-9108234', status: 'active' },
    { code: 'KHI', name: 'Karachi Branch', city: 'Karachi', address: 'ST-4, Block 5, Clifton, Karachi', contactNumber: '021-35874567', status: 'active' },
  ];

  for (const b of branches) {
    await Branch.findOneAndUpdate({ code: b.code }, b, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log('[SEED] Branches seeded');
};

const seedCourses = async () => {
  const courses = [
    { courseCode: 'CS101', title: 'Programming Fundamentals', creditHours: 3, department: 'Computer Science' },
    { courseCode: 'CS201', title: 'Data Structures', creditHours: 3, department: 'Computer Science' },
    { courseCode: 'CS301', title: 'Database Systems', creditHours: 3, department: 'Computer Science' },
    { courseCode: 'CS401', title: 'Software Engineering', creditHours: 3, department: 'Computer Science' },
    { courseCode: 'MT101', title: 'Calculus', creditHours: 3, department: 'Mathematics' },
    { courseCode: 'MT201', title: 'Linear Algebra', creditHours: 3, department: 'Mathematics' },
    { courseCode: 'EE101', title: 'Digital Logic', creditHours: 4, department: 'Electrical Engineering' },
    { courseCode: 'CS501', title: 'Computer Networks', creditHours: 3, department: 'Computer Science' },
  ];

  for (const c of courses) {
    await Course.findOneAndUpdate({ courseCode: c.courseCode }, c, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log('[SEED] Courses seeded');
};

const seedStudents = async () => {
  const hashed = await bcrypt.hash('demo', 10);

  const rename = [
    ['student1@examslot.com', 'm.ahmad.software.engineer@gmail.com'],
    ['student2@examslot.com', 'payment.io.social@gmail.com'],
  ];
  for (const [from, to] of rename) {
    const taken = await User.findOne({ email: to });
    if (!taken) await User.updateOne({ email: from }, { email: to });
  }

  const students = [
    {
      email: 'm.ahmad.software.engineer@gmail.com', fullName: 'Muhammad Ahmad', phone: '0300-1234567', cnic: '35201-1234567-1',
      dob: new Date('2002-05-15'), gender: 'Male', address: '123 Main St, Lahore',
      fatherName: 'Muhammad Khan', parentCnic: '35201-7654321-1', parentOccupation: 'Engineer', parentContact: '0300-7654321', emergencyContact: '0301-1234567',
      registrationNumber: 'FA20-BCS-001', program: 'BS Computer Science', semester: '5th', session: 'Fall 2020',
      previousQualification: 'FSc Pre-Engineering', previousInstitute: 'Govt College Lahore', previousMarks: '89%',
    },
    {
      email: 'payment.io.social@gmail.com', fullName: 'Fatima Ali', phone: '0321-2345678', cnic: '35201-2345678-2',
      dob: new Date('2003-08-22'), gender: 'Female', address: '45 Garden Town, Lahore',
      fatherName: 'Ali Ahmed', parentCnic: '35201-8765432-2', parentOccupation: 'Doctor', parentContact: '0321-8765432', emergencyContact: '0322-2345678',
      registrationNumber: 'FA21-BCS-002', program: 'BS Computer Science', semester: '3rd', session: 'Fall 2021',
      previousQualification: 'FSc Pre-Engineering', previousInstitute: 'LGS Lahore', previousMarks: '92%',
    },
    {
      email: 'student3@examslot.com', fullName: 'Usman Tariq', phone: '0333-3456789', cnic: '42101-3456789-3',
      dob: new Date('2001-12-01'), gender: 'Male', address: '78 Block B, Islamabad',
      fatherName: 'Tariq Mehmood', parentCnic: '42101-9876543-3', parentOccupation: 'Businessman', parentContact: '0333-9876543', emergencyContact: '0334-3456789',
      registrationNumber: 'SP21-BSE-003', program: 'BS Software Engineering', semester: '7th', session: 'Spring 2021',
      previousQualification: 'A-Levels', previousInstitute: 'Beaconhouse Islamabad', previousMarks: '3A* 2A',
    },
    {
      email: 'student4@examslot.com', fullName: 'Ayesha Malik', phone: '0345-4567890', cnic: '61101-4567890-4',
      dob: new Date('2002-03-10'), gender: 'Female', address: '12 Clifton, Karachi',
      fatherName: 'Malik Shahbaz', parentCnic: '61101-0987654-4', parentOccupation: 'Lawyer', parentContact: '0345-0987654', emergencyContact: '0346-4567890',
      registrationNumber: 'FA22-BCS-004', program: 'BS Computer Science', semester: '1st', session: 'Fall 2022',
      previousQualification: 'FSc Pre-Engineering', previousInstitute: 'DJ Science College Karachi', previousMarks: '85%',
    },
    {
      email: 'student5@examslot.com', fullName: 'Hassan Raza', phone: '0312-5678901', cnic: '35201-5678901-5',
      dob: new Date('2001-07-25'), gender: 'Male', address: '90 Johar Town, Lahore',
      fatherName: 'Raza Hussain', parentCnic: '35201-1098765-5', parentOccupation: 'Professor', parentContact: '0312-1098765', emergencyContact: '0313-5678901',
      registrationNumber: 'SP20-BIT-005', program: 'BS Information Technology', semester: '8th', session: 'Spring 2020',
      previousQualification: 'FSc Pre-Engineering', previousInstitute: 'FC College Lahore', previousMarks: '91%',
    },
  ];

  for (const s of students) {
    await User.findOneAndUpdate(
      { email: s.email },
      { ...s, password: hashed, role: 'STUDENT', isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log('[SEED] Students seeded');
};

const seedAssignmentsAndSlots = async () => {
  const courses = await Course.find().lean();
  const students = await User.find({ role: 'STUDENT' }).lean();
  const courseMap = {};
  courses.forEach((c) => { courseMap[c.courseCode] = c._id; });

  const assignmentMap = {
    'm.ahmad.software.engineer@gmail.com': ['CS101', 'CS201', 'CS301', 'CS401', 'MT101'],
    'payment.io.social@gmail.com': ['CS101', 'CS201', 'MT101', 'MT201', 'EE101'],
    'student3@examslot.com': ['CS301', 'CS401', 'CS501', 'MT201', 'EE101', 'CS201'],
    'student4@examslot.com': ['CS101', 'MT101', 'MT201', 'EE101'],
    'student5@examslot.com': ['CS401', 'CS501', 'CS301', 'MT201', 'CS201', 'EE101'],
  };

  for (const student of students) {
    const courseCodes = assignmentMap[student.email];
    if (!courseCodes) continue;
    for (const code of courseCodes) {
      if (!courseMap[code]) continue;
      await CourseAssignment.findOneAndUpdate(
        { student: student._id, course: courseMap[code] },
        { student: student._id, course: courseMap[code] },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
  console.log('[SEED] Course assignments seeded');

  // Exam slots: 2-3 per course, future dates
  const slotTemplates = [
    { dayOffset: 10, startTime: '09:00', endTime: '12:00' },
    { dayOffset: 10, startTime: '14:00', endTime: '17:00' },
    { dayOffset: 17, startTime: '09:00', endTime: '12:00' },
  ];

  const baseDate = new Date('2026-10-15');

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const templates = i % 2 === 0 ? slotTemplates : slotTemplates.slice(0, 2);

    for (const tmpl of templates) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + tmpl.dayOffset + i);

      await ExamSlot.findOneAndUpdate(
        { course: course._id, date, startTime: tmpl.startTime },
        {
          course: course._id,
          date,
          startTime: tmpl.startTime,
          endTime: tmpl.endTime,
          capacity: 1,
          booked: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
  console.log('[SEED] Exam slots seeded');
};

const seedAll = async () => {
  try {
    await seedAdmin();
    await seedBranches();
    await seedCourses();
    await seedStudents();
    await seedAssignmentsAndSlots();
  } catch (err) {
    console.error('[SEED] Failed:', err.message);
  }
};

module.exports = { seedAll };
