require("dotenv").config();
const mongoose = require("mongoose");
const SpeechAssessmentSnapshot = require("../src/modules/speechProcessing/models/speechAssessmentSnapshot.model");

const LEGACY_INDEX = "sessionId_1_kind_1_sequenceNo_1";

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  const collection = SpeechAssessmentSnapshot.collection;
  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === LEGACY_INDEX)) {
    await collection.dropIndex(LEGACY_INDEX);
    console.log(`Dropped legacy snapshot index: ${LEGACY_INDEX}`);
  }
  await SpeechAssessmentSnapshot.syncIndexes();
  console.log("Speech snapshot revision indexes are ready.");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
