import React from 'react';
import { AuthContextProvider } from './context/AuthContext';

export const metadata = {
  title: 'Admin Dashboard - TrekShield',
  description: 'Operations and catalog administration panel for TrekShield Wax products.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <div className="admin-portal-root">
        {children}
      </div>
    </AuthContextProvider>
  );
}
