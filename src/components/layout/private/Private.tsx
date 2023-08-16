import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

interface PrivateProps {
  children: React.ReactNode;
}

const Private: React.FC<PrivateProps> = ({ children }) => {
  const user = useSelector((state: any) => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.Token) {
      console.log("No token found, navigating to /staff...");
      navigate("/staff");
    }
  }, [user, navigate]);

  return <>{children}</>;
};

export default Private;
