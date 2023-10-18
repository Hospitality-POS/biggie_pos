import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../../store";

interface PrivateProps {
  children: React.ReactNode;
}

const Private: React.FC<PrivateProps> = ({ children }) => {
  const user = useAppSelector((state) => state.auth.user);

  // const navigate = useNavigate();

  // useEffect(() => {
    // if (!user) {
    //   console.log("No token found, navigating to /staff...");
      // navigate("/staff");
      // window.location.reload();
    // }
  // }, [user, navigate]);

  // return <>{children}</>;

  if (user) return children

  return <Navigate to='/tables' />

};

export default Private;
