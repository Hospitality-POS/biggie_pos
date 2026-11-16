import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

/**
 * Route guard wrapper that gates all Mteja CRM & Omnichannel views
 * behind the dynamic Mteja SaaS module license check.
 */
export const MtejaModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <ModuleGate moduleId="mteja">
      {children || <Outlet />}
    </ModuleGate>
  );
};

export default MtejaModuleGate;
