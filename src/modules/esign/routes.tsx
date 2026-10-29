import React from 'react';
import { ModuleGate } from '../shared/components/ModuleGate';

export const ESignModuleGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ModuleGate moduleId="esign">{children}</ModuleGate>;
};

export default ESignModuleGate;
