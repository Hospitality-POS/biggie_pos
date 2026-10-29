import React from 'react';
import { ModuleGate } from '../shared/components/ModuleGate';

export const PesaModuleGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ModuleGate moduleId="pesa">{children}</ModuleGate>;
};

export default PesaModuleGate;
