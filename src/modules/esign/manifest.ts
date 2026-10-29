import type { ModuleManifest } from '../../types/modules';

export const esignManifest: ModuleManifest = {
  id: 'esign',
  name: 'E-Sign & Document Center',
  description: 'Digital signatures, document management, contracts, templates, and audit trails',
  version: '1.0.0',
  icon: 'FileProtectOutlined',
  category: 'operations',
  subdomains: [
    {
      id: 'documents',
      name: 'Document Center',
      path: '/documents',
      description: 'Centralized document repository, folder organization, and cheques',
    },
    {
      id: 'signatures',
      name: 'E-Signature Workflows',
      path: '/esign',
      description: 'Multi-party signing workflows, signature capture, and field placements',
    },
    {
      id: 'templates',
      name: 'Templates & Library',
      path: '/esign/templates',
      description: 'Reusable document templates, contracts, and saved signatures/stamps',
    },
    {
      id: 'verification',
      name: 'Verification & Audit',
      path: '/esign/sign/:token',
      description: 'Public verification, signing links, and cryptographic certificates',
    },
  ],
  routes: [
    {
      path: '/documents',
      exact: true,
      permission: 'DOCUMENTS_VIEW',
    },
    {
      path: '/esign',
      exact: true,
      permission: 'SIGNATURE_VIEW',
    },
    {
      path: '/esign/sign/:token',
      exact: true,
    },
    {
      path: '/admin/documents',
      exact: true,
      permission: 'DOCUMENTS_VIEW',
    },
    {
      path: '/admin/esign',
      exact: true,
      permission: 'SIGNATURE_VIEW',
    },
  ],
};

export default esignManifest;
