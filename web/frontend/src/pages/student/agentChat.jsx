import { Navigate } from 'react-router-dom';

/** Legacy route — agent now opens as a slide-over panel from the navbar. */
const AgentChat = () => <Navigate to="/student/dashboard" replace />;

export default AgentChat;
