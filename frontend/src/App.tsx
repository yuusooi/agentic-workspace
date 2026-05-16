import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import ProjectListPage from './pages/ProjectListPage';
import PublicProjectsPage from './pages/PublicProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import KanbanPage from './pages/KanbanPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/public" element={<PublicProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/kanban" element={<KanbanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

export default App;
