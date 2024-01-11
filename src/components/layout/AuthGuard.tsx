import React, { useEffect } from 'react';
import jwtDecode from 'jwt-decode'; 
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../features/Auth/AuthActions'; // Import your actions and types
import { useAppDispatch, useAppSelector } from 'src/store';

// interface User {
//   Token: string;
// }

const ProtectedPage: React.FC = ({ children }) => {
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = user?.Token;

    if (token) {
      const decodedToken = jwtDecode<{ exp: number }>(token);

      if (decodedToken.exp * 1000 < Date.now()) {
        dispatch(logoutUser()); 
        navigate('/tables');
      }
    } else {
      navigate('/tables');
    }
  }, [dispatch, navigate, user?.Token]);

  return children;
};

export default ProtectedPage;
