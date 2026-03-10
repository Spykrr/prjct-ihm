import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from './contexts/SidebarContext';
import MainLayout from './layouts/MainLayout';

export default function App() {
  return (
    <SidebarProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/tests" replace />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </SidebarProvider>
  );
}
