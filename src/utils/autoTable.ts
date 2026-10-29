import * as autoTableModule from 'jspdf-autotable';

/**
 * jspdf-autotable ships CommonJS as its "default" export. Because this package
 * is "type": "module", Rolldown (Vite 8) applies Node-style interop, so
 * `import autoTable from 'jspdf-autotable'` yields the whole module.exports
 * object (`{ default: autoTable, ... }`) in production builds and the call
 * throws "(0, x.default) is not a function". Resolve the real function here
 * and import autoTable from this module instead of the package.
 */
const mod: any = autoTableModule;
const autoTable: typeof autoTableModule.default =
  typeof mod.default === 'function' ? mod.default : mod.default?.default ?? mod;

export default autoTable;
