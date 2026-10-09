import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/landing';
import LoginPage from './pages/login';
import SetupPasswordPage from './pages/setupPassword';
import ForgotPasswordPage from './pages/forgotPassword';
import AdminDashboard from './pages/admin/dashboard';
import AdminBranches from './pages/admin/branches';
import AdminCourses from './pages/admin/courses';
import AdminStudents from './pages/admin/students';
import AdminStudentDetail from './pages/admin/studentDetail';
import AdminSlots from './pages/admin/slots';
import AdminRequests from './pages/admin/requests';
import StudentSelectBranch from './pages/student/selectBranch';
import StudentDashboard from './pages/student/dashboard';
import StudentDateSheet from './pages/student/dateSheet';
import StudentRequests from './pages/student/requests';
import { AgentPanelProvider } from './components/AgentPanel';

function App() {
  return (
    <BrowserRouter>
      <AgentPanelProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password/:token" element={<SetupPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/branches" element={<ProtectedRoute adminOnly><AdminBranches /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute adminOnly><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute adminOnly><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute adminOnly><AdminStudentDetail /></ProtectedRoute>} />
          <Route path="/admin/slots" element={<ProtectedRoute adminOnly><AdminSlots /></ProtectedRoute>} />
          <Route path="/admin/requests" element={<ProtectedRoute adminOnly><AdminRequests /></ProtectedRoute>} />

          <Route path="/student/select-branch" element={<ProtectedRoute studentOnly><StudentSelectBranch /></ProtectedRoute>} />
          <Route path="/student/dashboard" element={<ProtectedRoute studentOnly><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/datesheet" element={<ProtectedRoute studentOnly><StudentDateSheet /></ProtectedRoute>} />
          <Route path="/student/requests" element={<ProtectedRoute studentOnly><StudentRequests /></ProtectedRoute>} />
          <Route path="/student/agent" element={<Navigate to="/student/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AgentPanelProvider>
    </BrowserRouter>
  );
}

export default App;
