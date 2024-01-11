import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../../store";

interface PrivateProps {
  children: React.ReactNode;
}

const Private: React.FC<PrivateProps> = ({ children }) => {
  const {user} = useAppSelector(state => state.auth);

  if (user) return children

  return <Navigate to='/tables' />

};

export default Private;
