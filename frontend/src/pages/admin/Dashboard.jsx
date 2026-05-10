import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import StudentProfiles from "./components/StudentProfiles";
import WMIdentifyResults from "./components/WMIdentifyResults";
import WMImproveResults from "./components/WMImproveResults";
import PAIdentifyResults from "./components/PAIdentifyResults";
import PAImproveResults from "./components/PAImproveResults";
import ReadingIdentifyResults from "./components/ReadingIdentifyResults";
import ReadingImproveResults from "./components/ReadingImproveResults";
import SpeechIdentifyResults from "./components/SpeechIdentifyResults";
import SpeechImproveResults from "./components/SpeechImproveResults";
import SpeechSupportResults from "./components/SpeechSupportResults";
import SpeechDataCollection from "./components/speech/SpeechDataCollection";
import SpeechAssignments from "./components/speech/SpeechAssignments";
import SpeechPromptBank from "./components/speech/SpeechPromptBank";
import Subscription from "./components/Subscription";
import SpeechOverview from "./components/speech/SpeechOverview";
import SpeechIdentificationResult from "./components/speech/SpeechIdentificationResult";
import SpeechImprovementProgress from "./components/speech/SpeechImprovementProgress";
import SpeechSessionHistory from "./components/speech/SpeechSessionHistory";

const Dashboard = () => {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";

  useEffect(() => {
    // Redirect to default tab if exactly at /admin or /admin/
    if (window.location.pathname === "/admin" || window.location.pathname === "/admin/") {
      navigate("/admin/students", { replace: true });
    }
  }, [navigate]);

  return (
    <AdminLayout>
      <Routes>
        <Route path="students" element={<StudentProfiles />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="wm-identify" element={<WMIdentifyResults />} />
        <Route path="wm-improve" element={<WMImproveResults />} />
        <Route path="pa-identify" element={<PAIdentifyResults />} />
        <Route path="pa-improve" element={<PAImproveResults />} />
        <Route path="reading-identify" element={<ReadingIdentifyResults />} />
        <Route path="reading-improve" element={<ReadingImproveResults />} />
        <Route path="speech-identify" element={<SpeechIdentifyResults />} />
        <Route path="speech-improve" element={<SpeechImproveResults />} />
        <Route path="speech-support" element={<SpeechSupportResults />} />
        <Route path="speech-data-collection" element={isSuperAdmin ? <SpeechDataCollection /> : <Navigate to="speech-overview" replace />} />
        <Route path="speech-assignments" element={isSuperAdmin ? <SpeechAssignments /> : <Navigate to="speech-overview" replace />} />
        <Route path="speech-prompt-bank" element={isSuperAdmin ? <SpeechPromptBank /> : <Navigate to="speech-overview" replace />} />
        <Route path="speech-overview" element={<SpeechOverview />} />
        <Route path="speech-identification-result" element={<SpeechIdentificationResult />} />
        <Route path="speech-improvement-progress" element={<SpeechImprovementProgress />} />
        <Route path="speech-session-history" element={<SpeechSessionHistory />} />
        <Route path="*" element={<Navigate to="students" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default Dashboard;
