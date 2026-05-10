const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");
const Student = require("./modules/common/models/student.model");

// Load environment variables
dotenv.config();

// Port
const PORT = process.env.PORT || 5000;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Student.ensureCompatibleIndexes();
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

// Start Server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

// Run
startServer();
