import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

export const DukaModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <ModuleGate moduleId="duka">{children || <Outlet />}</ModuleGate>;
};

export default DukaModuleGate;

