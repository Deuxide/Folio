import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DataPage } from "@/pages/DataPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { QuestionSetDetailPage } from "@/pages/QuestionSetDetailPage";
import { QuestionSetsPage } from "@/pages/QuestionSetsPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { SessionCompletePage } from "@/pages/SessionCompletePage";
import { SessionResultsPage } from "@/pages/SessionResultsPage";
import { SessionSetupPage } from "@/pages/SessionSetupPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { StudySessionPage } from "@/pages/StudySessionPage";
import { SubjectSessionCompletePage } from "@/pages/SubjectSessionCompletePage";
import { SubjectStudySessionPage } from "@/pages/SubjectStudySessionPage";
import { SubjectTestSetupPage } from "@/pages/SubjectTestSetupPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<QuestionSetsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="sessions/:sessionId" element={<SessionResultsPage />} />
            <Route path="sets/:id" element={<QuestionSetDetailPage />} />
            <Route path="sets/:id/setup" element={<SessionSetupPage />} />
            <Route path="sets/:id/study" element={<StudySessionPage />} />
            <Route path="sets/:id/complete" element={<SessionCompletePage />} />
            <Route path="subjects/:subjectKey/setup" element={<SubjectTestSetupPage />} />
            <Route path="subjects/:subjectKey/study" element={<SubjectStudySessionPage />} />
            <Route path="subjects/:subjectKey/complete" element={<SubjectSessionCompletePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
