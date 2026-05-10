const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./modules/common/routes/auth.routes");
const studentRoutes = require("./modules/common/routes/student.routes");
const phonologicalIdentifyRoutes = require("./modules/phonologicalAwareness/routes/phonologicalIdentify.routes");
const workingMemoryIdentifyRoutes = require("./modules/workingMemory/routes/workingMemoryIdentify.routes");
const adminRoutes = require("./modules/admin/routes/admin.routes");
const speechProcessingRoutes = require("./modules/speechProcessing/routes/speechProcessing.routes");
const subscriptionRoutes = require("./modules/subscription/subscription.routes");
const guardianRoutes = require("./modules/guardian/guardian.routes");
const lexilandProgressRoutes = require("./modules/lexiland/lexilandProgress.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/phonological-awareness/identification", phonologicalIdentifyRoutes);
app.use("/api/working-memory/identification", workingMemoryIdentifyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/speech-processing", speechProcessingRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/guardian", guardianRoutes);
app.use("/api/lexiland", lexilandProgressRoutes);

module.exports = app;
