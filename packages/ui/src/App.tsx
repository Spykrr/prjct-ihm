import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ScreensView from './views/admin/screens/ScreensView';
import PlaceholderView from './views/admin/PlaceholderView';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/tests" replace />} />
        <Route path="/tests" element={<ScreensView />} />
        <Route path="/soap" element={<PlaceholderView title="Gérer les tests Soap et leur définition" />} />
        <Route path="/ordonnancement" element={<PlaceholderView title="Ordonnancer les tests" />} />
        <Route path="/variables" element={<PlaceholderView title="Gérer les variables" />} />
      </Route>
      <Route path="*" element={<Navigate to="/tests" replace />} />
    </Routes>
  );
}
