import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import KnowledgePage from './pages/Knowledge';
import StudyTrackerPage from './pages/StudyTracker';
import JobBoardPage from './pages/JobBoard';
import CareerAssistantPage from './pages/CareerAssistant';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<StudyTrackerPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="jobs" element={<JobBoardPage />} />
            <Route path="career" element={<CareerAssistantPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
