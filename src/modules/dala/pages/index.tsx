import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import DalaDashboard from './Dashboard';
import PropertiesList from './properties/PropertiesList';
import PropertyDetail from './properties/PropertyDetail';
import UnitsList from './units/UnitsList';
import UnitDetail from './units/UnitDetail';
import SalesManagement from './sales/SalesManagement';
import SaleDetail from './sales/SaleDetail';
import CommissionManagement from './commissions/CommissionManagement';
import LeaseManagement from './leases/LeaseManagement';
import LeaseDetail from './leases/LeaseDetail';
import RentCollection from './rent/RentCollection';
import Reports from './reports/Reports';
import MaintenanceManagement from './maintenance/MaintenanceManagement';

const { Content } = Layout;

const DalaPage: React.FC = () => {
  return (
    <Content style={{ padding: '24px', minHeight: '280px' }}>
      <Routes>
        <Route path="/" element={<Navigate to="/dala/dashboard" replace />} />
        <Route path="/dashboard" element={<DalaDashboard />} />
        <Route path="/properties" element={<PropertiesList />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/units" element={<UnitsList />} />
        <Route path="/units/:id" element={<UnitDetail />} />
        <Route path="/sales" element={<SalesManagement />} />
        <Route path="/sales/:id" element={<SaleDetail />} />
        <Route path="/commissions" element={<CommissionManagement />} />
        <Route path="/leases" element={<LeaseManagement />} />
        <Route path="/leases/:id" element={<LeaseDetail />} />
        <Route path="/rent-collection" element={<RentCollection />} />
        <Route path="/maintenance" element={<MaintenanceManagement />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Content>
  );
};

export default DalaPage;
