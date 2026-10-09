import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isAdmin, homePathFor } from '../utils/roles';

const ProtectedRoute = ({ children, adminOnly = false, studentOnly = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin(user)) return <Navigate to={homePathFor(user)} replace />;
  if (studentOnly && isAdmin(user)) return <Navigate to="/admin" replace />;

  return children;
};

export default ProtectedRoute;
