import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSessionTabs,
  isSessionActionCurrent,
} from "./speechSessionPresentation.utils.js";

test("normal guardians never receive the technical detail tab", () => {
  const tabs = buildSessionTabs({ session: {}, isSuperAdmin: false });

  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["summary", "recording", "word_sound"]
  );
  assert.equal(tabs.some((tab) => tab.id === "technical"), false);
});

test("super admins receive technical details separately", () => {
  const tabs = buildSessionTabs({ session: {}, isSuperAdmin: true });

  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["summary", "recording", "word_sound", "technical"]
  );
  assert.equal(tabs.find((tab) => tab.id === "technical")?.visible, true);
});

test("all session tabs use localization keys instead of user-facing literals", () => {
  const tabs = buildSessionTabs({ session: {}, isSuperAdmin: true });

  assert.equal(
    tabs.every((tab) => tab.label.startsWith("guardian_session_tab_")),
    true
  );
});

test("a closed drawer invalidates an in-flight session action", () => {
  assert.equal(
    isSessionActionCurrent({
      sequence: 4,
      currentSequence: 4,
      childId: "child-a",
      currentChildId: "child-a",
      sessionId: "session-a",
      currentSession: null,
    }),
    false
  );
});

test("a response for a previous child cannot update the current drawer", () => {
  assert.equal(
    isSessionActionCurrent({
      sequence: 4,
      currentSequence: 4,
      childId: "child-a",
      currentChildId: "child-b",
      sessionId: "session-a",
      currentSession: { _id: "session-a" },
    }),
    false
  );
});

test("the active child and session accept their latest action response", () => {
  assert.equal(
    isSessionActionCurrent({
      sequence: 4,
      currentSequence: 4,
      childId: "child-a",
      currentChildId: "child-a",
      sessionId: "session-a",
      currentSession: { _id: "session-a" },
    }),
    true
  );
});
