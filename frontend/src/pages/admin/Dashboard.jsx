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

const Dashboard = () => {
  const navigate = useNavigate();

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
        <Route path="wm-identify" element={<WMIdentifyResults />} />
        <Route path="wm-improve" element={<WMImproveResults />} />
        <Route path="pa-identify" element={<PAIdentifyResults />} />
        <Route path="pa-improve" element={<PAImproveResults />} />
        <Route path="reading-identify" element={<ReadingIdentifyResults />} />
        <Route path="reading-improve" element={<ReadingImproveResults />} />
        <Route path="speech-identify" element={<SpeechIdentifyResults />} />
        <Route path="speech-improve" element={<SpeechImproveResults />} />
        <Route path="*" element={<Navigate to="students" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default Dashboard;
