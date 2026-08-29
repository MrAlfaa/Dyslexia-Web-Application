import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingGate from "./pages/common/LandingGate";
import Login from "./pages/common/Login";
import Register from "./pages/common/Register";
import Dashboard from "./pages/common/Dashboard";
import Profile from "./pages/common/Profile";
import PhonologicalAwareness  from "./pages/phonologicalAwareness/sample";
import ReadingProcessing  from "./pages/readingProcessing/sample";
import SpeechProcessing  from "./pages/speechProcessing/LeoSoundSafari";
import LeoIdentificationGame from "./pages/speechProcessing/LeoIdentificationGame";
import LeoTrainingSafari from "./pages/speechProcessing/LeoTrainingSafari";
import IdentificationActivitiesPA from "./pages/phonologicalAwareness/identificationActivities";
import ReportsDashboard from "./pages/common/reports/ReportsDashboard";
import ComponentReportSelect from "./pages/common/reports/ComponentReportSelect";
import PhonologicalAwarenessReport from "./pages/common/reports/PhonologicalAwarenessReport";
import IdentifyWorkingMemoryReport from "./pages/common/reports/IdentifyWorkingMemoryReport";

// Working Memory
import Identify from "./pages/workingMemory/identify/Identify";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminRegister from "./pages/admin/AdminRegister";
import AdminDashboard from "./pages/admin/Dashboard";
import { getAdminSessionState } from "./services/admin/adminSession.utils";

// Component to protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Component to prevent authenticated users from accessing login/register
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AdminProtectedRoute = ({ children }) => {
  if (getAdminSessionState(localStorage) === "anonymous") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

const AdminPublicRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    return <Navigate to="/admin/students" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingGate />} />

        {/* Public Routes - Only accessible if NOT logged in */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected Routes - Only accessible if logged in */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/phonological-awareness" element={<ProtectedRoute><PhonologicalAwareness /></ProtectedRoute>} />
        <Route path="/reading-processing" element={<ProtectedRoute><ReadingProcessing /></ProtectedRoute>} />
        <Route path="/speech-processing" element={<ProtectedRoute><SpeechProcessing /></ProtectedRoute>} />
        <Route path="/speech-processing/leo-identification" element={<ProtectedRoute><LeoIdentificationGame /></ProtectedRoute>} />
        <Route path="/speech-processing/leo-training" element={<ProtectedRoute><LeoTrainingSafari /></ProtectedRoute>} />
        <Route path="/speech-processing/leo-training/:activityId" element={<ProtectedRoute><LeoTrainingSafari /></ProtectedRoute>} />

        <Route path="/identificationActivities-pa/:grade" element={<ProtectedRoute><IdentificationActivitiesPA /></ProtectedRoute>} />
        <Route path="/working-memory/:grade" element={<ProtectedRoute><Identify /></ProtectedRoute>} />

        {/* Reports Routes */}
        <Route path="/reports" element={<ReportsDashboard />} />
        <Route path="/reports/:componentId" element={<ComponentReportSelect />} />
        <Route path="/reports/pa/identification" element={<PhonologicalAwarenessReport />} />
        <Route path="/reports/wm/identification" element={<IdentifyWorkingMemoryReport />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminPublicRoute><AdminLogin /></AdminPublicRoute>} />
        <Route path="/admin/register" element={<AdminPublicRoute><AdminRegister /></AdminPublicRoute>} />
        <Route path="/admin/*" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
