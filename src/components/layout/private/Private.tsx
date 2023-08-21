import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";

interface PrivateProps {
  children: React.ReactNode;
}

const Private: React.FC<PrivateProps> = ({ children }) => {
  const user = useSelector((state: any) => state.auth.user);

  const navigate = useNavigate();

  // useEffect(() => {
    // if (!user) {
    //   console.log("No token found, navigating to /staff...");
      // navigate("/staff");
      // window.location.reload();
    // }
  // }, [user, navigate]);

  // return <>{children}</>;

  if (user) return children

  return <Navigate to='/staff' />

};

export default Private;
