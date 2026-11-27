import { Navigate } from 'react-router';
import { useSelector } from 'react-redux';
import { hasRole } from '@helpers/auth';
import { CAN } from '@data/roles';
import Dashboard from './Dashboard';

// "/" : the dashboard for the manager; everyone else starts on the students list.
const Home = () => {
  const user = useSelector((s) => s.auth.user);
  return hasRole(user, CAN.viewDashboard) ? <Dashboard /> : <Navigate to="/students" replace />;
};

export default Home;
