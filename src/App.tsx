import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AssetList } from './pages/AssetList';
import { AssetForm } from './pages/AssetForm';
import { AssetDetail } from './pages/AssetDetail';
import { Import } from './pages/Import';
import { Login } from './pages/Login';

export interface AuthUser {
  name: string;
  role: string;
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem('asset_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: AuthUser) => {
    sessionStorage.setItem('asset_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('asset_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/assets" replace />} />
          <Route path="assets" element={<AssetList />} />
          <Route path="assets/new" element={<AssetForm />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="assets/:id/edit" element={<AssetForm />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </Router>
  );
}
