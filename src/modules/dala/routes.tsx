import React from 'react';
import { Outlet } from 'react-router-dom';
import { ModuleGate } from '@shared/licensing/ModuleGate';

/**
 * Route guard wrapper that gates all Dala real estate views
 * behind the dynamic Dala SaaS module license check.
 */
export const DalaModuleGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <ModuleGate moduleId="dala">
      {children || <Outlet />}
    </ModuleGate>
  );
};

export default DalaModuleGate;
