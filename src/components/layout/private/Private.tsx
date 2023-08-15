import jwtDecode from 'jwt-decode';
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../../../features/Auth/AuthActions';
import { useEffect } from 'react';

const Private: React.FC =({children})=> {
    const {user} = useSelector((state:any)=>state.auth)
  const navigate = useNavigate();
  const dispatch = useDispatch()

  useEffect(() => {
    const token = user?.Token

    if (token) {
      const decodedToken = jwtDecode<{ exp: number }>(token);

      if (decodedToken.exp * 1000 < Date.now()) {
       
        dispatch(logoutUser())
        navigate('/staff');
      }
    } else {
      
      navigate('/staff');
    }
  }, [dispatch, navigate, user?.Token]);

  return children;
}

export default Private