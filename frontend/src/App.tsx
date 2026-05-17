import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import ProjectListPage from './pages/ProjectListPage';
import PublicProjectsPage from './pages/PublicProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import KanbanPage from './pages/KanbanPage';
import UserSettingsPage from './pages/UserSettingsPage';
import ForbiddenPage from './pages/ForbiddenPage';
import AdminUserListPage from './pages/admin/AdminUserListPage';
import AdminProjectListPage from './pages/admin/AdminProjectListPage';
import AdminGuard from './components/auth/AdminGuard';
import AIPage from './pages/ai/AIPage';
import AutomationPage from './pages/project/AutomationPage';
import KnowledgeBasePage from './pages/project/KnowledgeBasePage';
import TemplateListPage from './pages/project/TemplateListPage';

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
        <Route path="/projects/:id/automation" element={<AutomationPage />} />
        <Route path="/projects/:id/knowledge" element={<KnowledgeBasePage />} />
        <Route path="/templates" element={<TemplateListPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/ai/history" element={<AIPage />} />
        <Route path="/ai/logs" element={<AIPage />} />
        <Route path="/settings" element={<UserSettingsPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/admin/users" element={<AdminGuard><AdminUserListPage /></AdminGuard>} />
        <Route path="/admin/projects" element={<AdminGuard><AdminProjectListPage /></AdminGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

export default App;
