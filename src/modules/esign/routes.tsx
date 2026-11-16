import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

export const ESignModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <ModuleGate moduleId="esign">{children || <Outlet />}</ModuleGate>;
};

export default ESignModuleGate;

