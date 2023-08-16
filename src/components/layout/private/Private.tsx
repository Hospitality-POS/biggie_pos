import jwtDecode from "jwt-decode";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../../../features/Auth/AuthActions";
import React, { useEffect } from "react";

interface PrivateProps {
  children: React.ReactNode;
}

const Private: React.FC<PrivateProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = user?.Token;
    console.log("Checking token...");
    if (token) {
      const decodedToken = jwtDecode<{ exp: number }>(token);

      if (decodedToken.exp * 1000 < Date.now()) {
        console.log("Token expired, logging out...");
        dispatch(logoutUser());
        navigate("/staff");
      }
    } else {
      console.log("No token found, navigating to /staff...");
      navigate("/staff");
    }
  }, [dispatch, navigate]);

  return <>{children}</>;
};

export default Private;
