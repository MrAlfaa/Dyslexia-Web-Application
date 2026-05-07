const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/common/routes/auth.routes");
const studentRoutes = require("./modules/common/routes/student.routes");
const phonologicalIdentifyRoutes = require("./modules/phonologicalAwareness/routes/phonologicalIdentify.routes");
const workingMemoryIdentifyRoutes = require("./modules/workingMemory/routes/workingMemoryIdentify.routes");
const adminRoutes = require("./modules/admin/routes/admin.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/phonological-awareness/identification", phonologicalIdentifyRoutes);
app.use("/api/working-memory/identification", workingMemoryIdentifyRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;