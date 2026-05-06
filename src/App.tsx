import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate } from
'react-router-dom';
import { Layout } from './components/Layout';
import { AssetList } from './pages/AssetList';
import { AssetForm } from './pages/AssetForm';
import { AssetDetail } from './pages/AssetDetail';
import { Import } from './pages/Import';
export function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/assets" replace />} />
          <Route path="assets" element={<AssetList />} />
          <Route path="assets/new" element={<AssetForm />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="assets/:id/edit" element={<AssetForm />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </Router>);

}