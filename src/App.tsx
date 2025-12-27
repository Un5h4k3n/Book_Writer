import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { useThemeStore } from './stores/themeStore';
import { useProjectStore } from './stores/projectStore';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

import SettingsPage from './pages/settings/SettingsPage';
import RolesPage from './pages/settings/RolesPage';
import CharactersList from './pages/characters/CharactersList';
import CharacterEditor from './pages/characters/CharacterEditor';
import WorldList from './pages/world/WorldList';
import WorldEditor from './pages/world/WorldEditor';
import ImportPage from './pages/import/ImportPage';

import OutlinePage from './pages/outline/OutlinePage';
import DraftingPage from './pages/draft/DraftingPage';
import LibraryPage from './pages/dashboard/LibraryPage';

// Placeholder Pages (we'll implement these next)


function RequireProject({ children }: { children: JSX.Element }) {
  const { project, isLoading } = useProjectStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-accent-color">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  if (!project) {
    // Redirect to library if no project is loaded
    return <Navigate to="/library" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  const { theme } = useThemeStore();
  const { init } = useProjectStore();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Init
  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />

          {/* Public Routes */}
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Protected Project Routes */}
          <Route path="/outline" element={<RequireProject><OutlinePage /></RequireProject>} />
          <Route path="/draft" element={<RequireProject><DraftingPage /></RequireProject>} />
          <Route path="/draft/:sceneId" element={<RequireProject><DraftingPage /></RequireProject>} />
          <Route path="/characters" element={<RequireProject><CharactersList /></RequireProject>} />
          <Route path="/characters/:id" element={<RequireProject><CharacterEditor /></RequireProject>} />
          <Route path="/world" element={<RequireProject><WorldList /></RequireProject>} />
          <Route path="/world/:id" element={<RequireProject><WorldEditor /></RequireProject>} />
          <Route path="/roles" element={<RequireProject><RolesPage /></RequireProject>} />
          <Route path="/import" element={<RequireProject><ImportPage /></RequireProject>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
