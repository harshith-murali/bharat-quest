import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { SessionProvider } from './store/sessionStore';
import SectionSelectPage from './pages/SectionSelectPage';
import DashboardPage from './pages/DashboardPage';
import QuizScreen from './pages/QuizScreen';
import LeaderboardPage from './pages/LeaderboardPage';
import CarPreviewPage from './pages/CarPreviewPage';
import AdminPage from './pages/AdminPage';
import StaffLoginPage from './pages/StaffLoginPage';
import SessionInitializer from './components/SessionInitializer';
import ToastProvider from './components/ToastProvider';
import LoadingScreen from './components/LoadingScreen';
import NotFoundPage from './pages/NotFoundPage';

// Code-split the 3D-heavy screens.
const MapScreen = lazy(() => import('./pages/MapScreen'));
const QuestStatePage = lazy(() => import('./pages/QuestStatePage'));

function LegacyGameRedirect() {
  const { sectionId } = useParams<{ sectionId: string }>();
  return <Navigate to={`/session/${sectionId}/dashboard`} replace />;
}

function LegacyHomeRedirect() {
  const { sectionId } = useParams<{ sectionId: string }>();
  return <Navigate to={`/session/${sectionId}/dashboard`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
        <Suspense fallback={<LoadingScreen message="Preparing your journey…" hint="Loading the map of India" />}>
        <Routes>
          {/* Login / Section Select */}
          <Route path="/" element={<SectionSelectPage />} />

          {/* Teacher Dashboard — post-login gateway */}
          <Route
            path="/session/:sectionId/dashboard"
            element={
              <SessionInitializer>
                <DashboardPage />
              </SessionInitializer>
            }
          />


          {/* Quest flow — Map is primary Quest interface */}
          <Route
            path="/session/:sectionId/map"
            element={
              <SessionInitializer>
                <MapScreen />
              </SessionInitializer>
            }
          />
          <Route
            path="/session/:sectionId/quest/:stateName"
            element={
              <SessionInitializer>
                <QuestStatePage />
              </SessionInitializer>
            }
          />

          {/* Existing quiz screen (mission-based, preserved) */}
          <Route
            path="/session/:sectionId/quiz"
            element={
              <SessionInitializer>
                <QuizScreen />
              </SessionInitializer>
            }
          />

          {/* Staff sign-in (teachers & admins) */}
          <Route path="/session/:sectionId/staff-login" element={<StaffLoginPage />} />

          {/* Teacher admin — manage students */}
          <Route
            path="/session/:sectionId/admin"
            element={
              <SessionInitializer>
                <AdminPage />
              </SessionInitializer>
            }
          />

          {/* Home screen — redirect to dashboard */}
          <Route path="/session/:sectionId/home" element={<LegacyHomeRedirect />} />

          {/* Backward-compat legacy routes */}
          <Route path="/game/:sectionId" element={<LegacyGameRedirect />} />
          <Route path="/leaderboard/:sectionId" element={<LeaderboardPage />} />
          <Route path="/car-preview" element={<CarPreviewPage />} />

          {/* Fallback */}
          {/* Unknown route — show a 404 rather than silently redirecting. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
