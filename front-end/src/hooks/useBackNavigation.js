import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useBackNavigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigateBack = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Navigate based on user role
    switch (user.role?.toLowerCase()) {
      case 'student':
        navigate('/dashboard');
        break;
      case 'faculty':
        navigate('/dashboard/faculty');
        break;
      case 'coordinator':
        navigate('/dashboard/coordinator');
        break;
      case 'hod':
        navigate('/dashboard/hod');
        break;
      case 'principal':
        navigate('/dashboard/principal');
        break;
      case 'accounts':
        navigate('/dashboard/accounts');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return navigateBack;
};