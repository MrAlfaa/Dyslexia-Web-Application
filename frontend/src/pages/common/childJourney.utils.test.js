import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildChildJourney, normalizeChildProfile } from "./childJourney.utils.js";

const findDestination = (journey, section, id) =>
  journey[section].find((destination) => destination.id === id);

test("speech training unlocks from its own completed baseline", () => {
  const journey = buildChildJourney({
    profile: {
      grade: "3",
      lexilandProgress: {
        improvementUnlocked: false,
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: true,
        },
      },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(journey, "improvement", "sp").state, "current");
  assert.equal(findDestination(journey, "improvement", "wm").state, "locked");
});

test("development unlock affects only the Leo speech destination", () => {
  const journey = buildChildJourney({
    profile: { lexilandProgress: {} },
    devUnlock: true,
  });

  const speech = findDestination(journey, "improvement", "sp");
  assert.equal(speech.state, "current");
  assert.equal(speech.devPreview, true);
  assert.equal(findDestination(journey, "improvement", "wm").state, "locked");
  assert.equal(findDestination(journey, "improvement", "pa").state, "locked");
  assert.equal(findDestination(journey, "improvement", "rp").state, "locked");
});

test("an in-progress speech check stays the current mission during development unlock", () => {
  const journey = buildChildJourney({
    profile: {
      lexilandProgress: {
        speech: {
          identificationStatus: "in_progress",
          improvementUnlocked: false,
        },
      },
    },
    devUnlock: true,
  });

  assert.equal(journey.currentMission.section, "identification");
  assert.equal(journey.currentMission.state, "current");
  assert.equal(journey.currentMission.route, "/speech-processing");
});

test("legacy overall unlock does not unlock speech without its own baseline flag", () => {
  const journey = buildChildJourney({
    profile: {
      lexilandProgress: {
        improvementUnlocked: true,
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: false,
        },
      },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(journey, "improvement", "wm").state, "available");
  assert.equal(findDestination(journey, "improvement", "pa").state, "available");
  assert.equal(findDestination(journey, "improvement", "rp").state, "available");
  assert.equal(findDestination(journey, "improvement", "sp").state, "locked");
});

test("current mission uses an available standard check while speech baseline review is locked", () => {
  const journey = buildChildJourney({
    profile: {
      grade: "3",
      lexilandProgress: {
        improvementUnlocked: false,
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: false,
        },
      },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(journey, "improvement", "sp").state, "locked");
  assert.equal(journey.currentMission.id, "wm");
  assert.equal(journey.currentMission.section, "identification");
  assert.equal(journey.currentMission.state, "available");
  assert.equal(journey.currentMission.route, "/working-memory/3");
});

test("speech identification keeps current, completed, and available states distinct", () => {
  const available = buildChildJourney({ profile: {}, devUnlock: false });
  const current = buildChildJourney({
    profile: {
      lexilandProgress: { speech: { identificationStatus: "in_progress" } },
    },
    devUnlock: false,
  });
  const completed = buildChildJourney({
    profile: {
      lexilandProgress: { speech: { identificationStatus: "completed" } },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(available, "identification", "sp").state, "available");
  assert.equal(findDestination(current, "identification", "sp").state, "current");
  assert.equal(findDestination(completed, "identification", "sp").state, "completed");
});

test("speech destinations and current mission never use the legacy reports route", () => {
  const journey = buildChildJourney({
    profile: {
      lexilandProgress: {
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: true,
          currentActivityId: "leo_sound_twins",
        },
      },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(journey, "identification", "sp").route, "/speech-processing");
  assert.equal(findDestination(journey, "improvement", "sp").route, "/speech-processing/leo-training");
  assert.equal(journey.currentMission.route, "/speech-processing/leo-training");
  assert.equal(JSON.stringify(journey).includes("/reports/sp"), false);
});

test("every locked destination includes a child-visible reason key", () => {
  const journey = buildChildJourney({ profile: {}, devUnlock: false });
  const locked = [...journey.identification, ...journey.improvement].filter(
    (destination) => destination.state === "locked",
  );

  assert.ok(locked.length > 0);
  assert.ok(locked.every((destination) => destination.lockReasonKey));
});

test("completed speech activities are reflected without exposing model labels", () => {
  const journey = buildChildJourney({
    profile: {
      lexilandProgress: {
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: true,
          currentActivityId: "leo_robot_words",
          completedActivityIds: ["leo_first_sound_hunt"],
          stars: 4,
        },
      },
    },
    devUnlock: false,
  });

  const speech = findDestination(journey, "improvement", "sp");
  assert.equal(speech.completedCount, 1);
  assert.equal(speech.stars, 4);
  assert.equal(speech.currentActivityId, "leo_robot_words");
  assert.equal("supportLevel" in speech, false);
  assert.equal("supportScore" in speech, false);
});

test("profile payloads normalize both direct and wrapped student shapes", () => {
  const student = {
    fullName: "Maya",
    grade: "4",
    lexilandProgress: {
      speech: {
        identificationStatus: "completed",
        improvementUnlocked: true,
      },
    },
  };

  assert.deepEqual(normalizeChildProfile(student), student);
  assert.deepEqual(normalizeChildProfile({ student }), student);
  assert.deepEqual(normalizeChildProfile(null), {});

  const wrappedJourney = buildChildJourney({ profile: { student }, devUnlock: false });
  assert.equal(findDestination(wrappedJourney, "improvement", "sp").state, "current");
});

test("working memory, phonological awareness, and reading routes remain available", () => {
  const journey = buildChildJourney({
    profile: {
      grade: "4",
      lexilandProgress: { improvementUnlocked: true },
    },
    devUnlock: false,
  });

  assert.equal(findDestination(journey, "identification", "wm").route, "/working-memory/4");
  assert.equal(
    findDestination(journey, "identification", "pa").route,
    "/identificationActivities-pa/4",
  );
  assert.equal(findDestination(journey, "identification", "rp").route, "/reading-processing");
  assert.equal(findDestination(journey, "improvement", "wm").state, "available");
  assert.equal(findDestination(journey, "improvement", "pa").route, "/phonological-awareness");
  assert.equal(findDestination(journey, "improvement", "rp").route, "/reading-processing");
});

test("journey translation keys exist in English and Sinhala", () => {
  const loadLocale = (language) =>
    JSON.parse(
      readFileSync(new URL(`../../locales/${language}/common.json`, import.meta.url), "utf8"),
    );
  const getValue = (locale, key) =>
    key.split(".").reduce((value, part) => value?.[part], locale);
  const journey = buildChildJourney({ profile: {}, devUnlock: false });
  const destinationKeys = [...journey.identification, ...journey.improvement].flatMap(
    (destination) =>
      [
        destination.titleKey,
        destination.descriptionKey,
        destination.actionKey,
        destination.statusKey,
        destination.lockReasonKey,
      ].filter(Boolean),
  );
  const dashboardKeys = [
    "journey.adventurer",
    "journey.dashboardKicker",
    "journey.dashboardSubtitle",
    "journey.currentMission",
    "journey.developmentPreview",
    "journey.identificationEyebrow",
    "journey.identificationTitle",
    "journey.identificationHint",
    "journey.improvementEyebrow",
    "journey.improvementTitle",
    "journey.progressTitle",
    "journey.progressDescription",
    "journey.openProfile",
    "journey.viewLeoProgress",
    "journey.loading",
    "journey.loadErrorTitle",
    "journey.loadErrorDescription",
    "journey.tryAgain",
    "journey.leoAlt",
    "journey.starsCount",
    "journey.starsAriaLabel",
  ];

  for (const language of ["en", "si"]) {
    const locale = loadLocale(language);
    for (const key of new Set([...destinationKeys, ...dashboardKeys])) {
      assert.equal(typeof getValue(locale, key), "string", `${language} is missing ${key}`);
      assert.notEqual(getValue(locale, key).trim(), "", `${language} has an empty ${key}`);
    }
    assert.equal(JSON.stringify(locale).includes("�"), false);
  }
});
