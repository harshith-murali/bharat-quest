import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { SessionProvider } from './store/sessionStore';
import SectionSelectPage from './pages/SectionSelectPage';
import HomeScreen from './pages/HomeScreen';
import MapScreen from './pages/MapScreen';
import QuizScreen from './pages/QuizScreen';
import LeaderboardPage from './pages/LeaderboardPage';
import CarPreviewPage from './pages/CarPreviewPage';
import SessionInitializer from './components/SessionInitializer';

function LegacyGameRedirect() {
  const { sectionId } = useParams<{ sectionId: string }>();
  return <Navigate to={`/session/${sectionId}/home`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<SectionSelectPage />} />
          <Route
            path="/session/:sectionId/home"
            element={
              <SessionInitializer>
                <HomeScreen />
              </SessionInitializer>
            }
          />
          <Route
            path="/session/:sectionId/map"
            element={
              <SessionInitializer>
                <MapScreen />
              </SessionInitializer>
            }
          />
          <Route
            path="/session/:sectionId/quiz"
            element={
              <SessionInitializer>
                <QuizScreen />
              </SessionInitializer>
            }
          />
          <Route path="/game/:sectionId" element={<LegacyGameRedirect />} />
          <Route path="/leaderboard/:sectionId" element={<LeaderboardPage />} />
          <Route path="/car-preview" element={<CarPreviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
