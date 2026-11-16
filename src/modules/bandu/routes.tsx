import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

/**
 * Route guard wrapper that gates all Bandu HR & Payroll views
 * behind the dynamic Bandu SaaS module license check.
 */
export const BanduModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <ModuleGate moduleId="bandu">
      {children || <Outlet />}
    </ModuleGate>
  );
};

export default BanduModuleGate;
