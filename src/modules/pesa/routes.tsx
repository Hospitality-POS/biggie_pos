import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

export const PesaModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <ModuleGate moduleId="pesa">{children || <Outlet />}</ModuleGate>;
};

export default PesaModuleGate;

