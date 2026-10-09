const {
  User, Branch, Course, CourseAssignment, ExamSlot, DateSheetSelection, ChangeRequest,
  formatDoc, formatDocs,
} = require('../models');
const agentService = require('../services/agent.service');

// ── Helpers ──

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const slotsOverlap = (a, b) => {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = a.endTime ? timeToMinutes(a.endTime) : aStart + 180;
  const bStart = timeToMinutes(b.startTime);
  const bEnd = b.endTime ? timeToMinutes(b.endTime) : bStart + 180;
  return aStart < bEnd && bStart < aEnd;
};

// ═══════════════════════════════════════════

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email })
      .populate('selectedBranch')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, passwordSetupToken, passwordSetupExpiry, ...safe } = formatDoc(user);
    res.status(200).json({ data: safe });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const selectBranch = async (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });

    const branch = await Branch.findById(branchId);
    if (!branch || branch.status !== 'active') {
      return res.status(400).json({ message: 'Branch not found or inactive' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.branchLocked) {
      const approvedRequest = await ChangeRequest.findOne({
        student: user._id,
        type: 'CHANGE_BRANCH',
        status: 'APPROVED',
        used: false,
      });
      if (!approvedRequest) {
        return res.status(400).json({ message: 'Branch is already locked. Submit a change request to modify.' });
      }
      approvedRequest.used = true;
      await approvedRequest.save();
    }

    user.selectedBranch = branchId;
    user.branchLocked = true;
    await user.save();

    res.status(200).json({ message: 'Branch selected successfully' });
  } catch (error) {
    console.error('selectBranch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAssignedCourses = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const assignments = await CourseAssignment.find({ student: user._id }).populate('course').lean();

    const result = await Promise.all(
      assignments.map(async (a) => {
        const slots = await ExamSlot.find({ course: a.course._id }).sort({ date: 1, startTime: 1 }).lean();
        return {
          course: formatDoc(a.course),
          slots: formatDocs(slots),
        };
      })
    );

    res.status(200).json({ data: result });
  } catch (error) {
    console.error('getAssignedCourses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveDateSheet = async (req, res) => {
  try {
    const { selections } = req.body;
    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ message: 'selections array is required' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.selectedBranch) {
      return res.status(400).json({ message: 'Please select a branch first' });
    }

    let usedChangeRequest = null;
    if (user.dateSheetSaved) {
      const approvedRequest = await ChangeRequest.findOne({
        student: user._id,
        type: 'CHANGE_DATESHEET',
        status: 'APPROVED',
        used: false,
      });
      if (!approvedRequest) {
        return res.status(400).json({ message: 'Date sheet already saved. Submit a change request to modify.' });
      }
      usedChangeRequest = approvedRequest;
    }

    const assignments = await CourseAssignment.find({ student: user._id }).lean();
    const assignedCourseIds = assignments.map((a) => a.course.toString());

    if (selections.length !== assignments.length) {
      return res.status(400).json({
        message: `You must select a slot for all ${assignments.length} assigned courses`,
      });
    }

    const selectedSlots = [];
    for (const sel of selections) {
      if (!sel.courseId || !sel.slotId) {
        return res.status(400).json({ message: 'Each selection must have courseId and slotId' });
      }
      if (!assignedCourseIds.includes(sel.courseId.toString())) {
        return res.status(400).json({ message: `Course ${sel.courseId} is not assigned to you` });
      }

      const slot = await ExamSlot.findById(sel.slotId).lean();
      if (!slot) {
        return res.status(400).json({ message: `Slot ${sel.slotId} not found` });
      }
      if (slot.course.toString() !== sel.courseId.toString()) {
        return res.status(400).json({ message: `Slot ${sel.slotId} does not belong to course ${sel.courseId}` });
      }

      if (slot.capacity > 0 && slot.booked >= slot.capacity) {
        return res.status(400).json({ message: `Slot for ${sel.courseId} is fully booked` });
      }

      selectedSlots.push({ ...sel, slot });
    }

    // Conflict check: no two slots on the same date with overlapping times
    for (let i = 0; i < selectedSlots.length; i++) {
      for (let j = i + 1; j < selectedSlots.length; j++) {
        const a = selectedSlots[i].slot;
        const b = selectedSlots[j].slot;
        const dateA = new Date(a.date).toDateString();
        const dateB = new Date(b.date).toDateString();
        if (dateA === dateB && slotsOverlap(a, b)) {
          return res.status(400).json({
            message: `Time conflict between slots on ${dateA}: ${a.startTime} and ${b.startTime}`,
          });
        }
      }
    }

    // All valid — save
    await DateSheetSelection.deleteMany({ student: user._id });

    const docs = selections.map((sel) => ({
      student: user._id,
      course: sel.courseId,
      examSlot: sel.slotId,
    }));
    await DateSheetSelection.insertMany(docs);

    // Increment booked count
    for (const sel of selectedSlots) {
      if (sel.slot.capacity > 0) {
        await ExamSlot.findByIdAndUpdate(sel.slotId, { $inc: { booked: 1 } });
      }
    }

    user.dateSheetSaved = true;
    await user.save();

    if (usedChangeRequest) {
      usedChangeRequest.used = true;
      await usedChangeRequest.save();
    }

    res.status(200).json({ message: 'Date sheet saved successfully' });
  } catch (error) {
    console.error('saveDateSheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDateSheet = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email })
      .populate('selectedBranch')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const selections = await DateSheetSelection.find({ student: user._id })
      .populate('course')
      .populate('examSlot')
      .sort({ 'examSlot.date': 1 })
      .lean();

    const formattedSelections = formatDocs(selections).sort((a, b) => {
      const dateA = a.examSlot ? new Date(a.examSlot.date) : 0;
      const dateB = b.examSlot ? new Date(b.examSlot.date) : 0;
      return dateA - dateB;
    });

    res.status(200).json({
      data: {
        student: {
          fullName: user.fullName,
          registrationNumber: user.registrationNumber,
          program: user.program,
          branch: user.selectedBranch ? formatDoc(user.selectedBranch) : null,
        },
        selections: formattedSelections,
        dateSheetSaved: user.dateSheetSaved,
      },
    });
  } catch (error) {
    console.error('getDateSheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createRequest = async (req, res) => {
  try {
    const { type, reason } = req.body;
    if (!type || !['CHANGE_BRANCH', 'CHANGE_DATESHEET'].includes(type)) {
      return res.status(400).json({ message: 'type must be CHANGE_BRANCH or CHANGE_DATESHEET' });
    }
    if (!reason) return res.status(400).json({ message: 'reason is required' });

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existing = await ChangeRequest.findOne({
      student: user._id,
      type,
      status: 'PENDING',
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending request of this type' });
    }

    const request = await ChangeRequest.create({ student: user._id, type, reason });
    res.status(201).json({ message: 'Request submitted', data: formatDoc(request) });
  } catch (error) {
    console.error('createRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const requests = await ChangeRequest.find({ student: user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ data: formatDocs(requests) });
  } catch (error) {
    console.error('getMyRequests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const loadCoursesForAgent = async (user) => {
  const assignments = await CourseAssignment.find({ student: user._id }).populate('course').lean();
  const courses = await Promise.all(
    assignments.map(async (a) => {
      const slots = await ExamSlot.find({ course: a.course._id }).sort({ date: 1, startTime: 1 }).lean();
      return {
        id: a.course._id.toString(),
        courseCode: a.course.courseCode || '',
        title: a.course.title || '',
        slots: slots.map((s) => ({
          id: s._id.toString(),
          date: s.date ? new Date(s.date).toISOString() : '',
          startTime: s.startTime,
          endTime: s.endTime || null,
          capacity: s.capacity || 0,
          booked: s.booked || 0,
        })),
      };
    })
  );
  return courses;
};

const agentChat = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.dateSheetSaved) {
      return res.status(400).json({ message: 'Date sheet already saved. Raise a change request to unlock.' });
    }

    const courses = await loadCoursesForAgent(user);
    if (!courses.length) {
      return res.status(400).json({ message: 'No courses assigned yet' });
    }

    const { message = '', preferences = [], action = null, threadId = 'default' } = req.body || {};
    const data = await agentService.chat({
      studentId: user._id.toString(),
      threadId,
      message,
      courses,
      preferences,
      action,
    });
    res.status(200).json({ data });
  } catch (error) {
    console.error('agentChat error:', error.response?.data || error.message);
    res.status(502).json({
      message: error.response?.data?.detail || error.message || 'Agent service unavailable',
    });
  }
};

const agentApply = async (req, res) => {
  try {
    const { selections: selectionMap } = req.body || {};
    if (!selectionMap || typeof selectionMap !== 'object' || Array.isArray(selectionMap)) {
      return res.status(400).json({ message: 'selections map { courseId: slotId } is required' });
    }

    const selections = Object.entries(selectionMap).map(([courseId, slotId]) => ({
      courseId,
      slotId,
    }));
    if (!selections.length) {
      return res.status(400).json({ message: 'selections map is empty' });
    }

    req.body = { selections };
    return saveDateSheet(req, res);
  } catch (error) {
    console.error('agentApply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const agentReset = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const threadId = req.body?.threadId || 'default';
    await agentService.reset({ studentId: user._id.toString(), threadId });
    res.status(200).json({ message: 'Agent thread reset' });
  } catch (error) {
    console.error('agentReset error:', error.response?.data || error.message);
    res.status(502).json({ message: 'Failed to reset agent thread' });
  }
};

const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' }).lean();
    res.status(200).json({ data: formatDocs(branches) });
  } catch (error) {
    console.error('getBranches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  getBranches,
  selectBranch,
  getAssignedCourses,
  saveDateSheet,
  getDateSheet,
  createRequest,
  getMyRequests,
  agentChat,
  agentApply,
  agentReset,
};
