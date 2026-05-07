import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { QUIZ_DATA } from "../quizData";
import { saveWorkingMemoryResult } from "../../../services/workingMemory/identifyApi";

import { analyzeSequenceError } from "../../../utils/workingMemory/errorAnalysis";
import { calculateWorkingMemoryMetrics } from "../../../utils/workingMemory/scoring.util";

// ---------------- HELPERS ----------------

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const getCategoryPrefix = (category, t) => {
  if (category === "Memory Recall") return t("prep_memory_recall");
  if (category === "Word Memory") return t("prep_word_memory");
  if (category === "Instruction") return t("prep_instruction");
  if (category === "Pattern") return t("prep_pattern");
  return "";
};

// ---------------- DRAG & DROP ----------------

const DragDrop = ({ items, onSubmit, numSlots = null }) => {
  const [pool] = useState(shuffle(items));
  const [slots, setSlots] = useState(Array(numSlots !== null ? numSlots : items.length).fill(""));

  const handleItemClick = (value) => {
    // Find first empty slot
    const emptyIndex = slots.findIndex(s => s === "");
    if (emptyIndex !== -1) {
      const updated = [...slots];
      updated[emptyIndex] = value;
      setSlots(updated);
    }
  };

  const handleSlotClick = (index) => {
    const updated = [...slots];
    updated[index] = "";
    setSlots(updated);
  };

  return (
    <div className="flex flex-col items-center animate-fadeIn w-full px-4 justify-center">
      {/* Slots */}
      <div className="flex gap-4 mb-8 flex-wrap justify-center">
        {slots.map((val, i) => (
          <div
            key={i}
            onClick={() => handleSlotClick(i)}
            className={`w-28 h-16 lg:w-48 lg:h-24 flex items-center justify-center border-4 lg:border-6 border-dashed rounded-[1rem] text-xl lg:text-3xl font-black cursor-pointer transition-all ${val
              ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-inner scale-105'
              : 'border-slate-300 bg-slate-50 text-slate-300 hover:border-amber-300'
              }`}
          >
            {val || "?"}
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {pool.map((item, i) => (
          <button
            key={i}
            onClick={() => handleItemClick(item)}
            className="px-4 py-1.5 bg-white border-b-4 border-slate-200 rounded-[1rem] text-base lg:text-lg font-black text-slate-700 hover:border-amber-400 hover:text-amber-500 shadow-md transition-all hover:-translate-y-1 active:translate-y-1 cursor-pointer text-center"
          >
            {item}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSubmit(slots)}
        className="bg-amber-500 hover:bg-amber-600 text-base px-8 py-2 rounded-full font-black shadow-[0_3px_0_rgb(180,83,9)] text-white uppercase tracking-wider transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none"
      >
        {items.length === 1 ? "Submit Answer!" : "Submit Answers!"}
      </button>
    </div>
  );
};

// ---------------- MAIN ----------------

const wordToImageMap = {
  // English
  "cat": "cat.png",
  "ball": "ball.png",
  "tree": "tree.png",
  "sun": "sun.png",
  "book": "book.png",
  "fish": "fish.png",
  "dog": "dog.png",
  "cup": "cup.png",
  "bottle": "bottle.png",
  "bird": "bird.png",
  "river": "river.png",
  "home": "house.png",
  "house": "house.png",

  // Sinhala
  "පූසා": "cat.png",
  "බෝලය": "ball.png",
  "ගස": "tree.png",
  "ඉර": "sun.png",
  "පොත": "book.png",
  "මාළුවා": "fish.png",
  "බල්ලා": "dog.png",
  "කෝප්පය": "cup.png",
  "බෝතලය": "bottle.png",
  "කුරුල්ලා": "bird.png",
  "ගඟ": "river.png",
  "ගෙදර": "house.png"
};

export default function Identify() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation("wm");

  const queryParams = new URLSearchParams(location.search);
  const isDemo = queryParams.get("demo") === "true";

  const [quizData, setQuizData] = useState([]);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState("show"); // show → blur → answer
  const [results, setResults] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [finished, setFinished] = useState(false);

  // Audio Logic
  const speak = (text, isSlow = true) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'si' ? 'si-LK' : 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(i18n.language)) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = isSlow ? 0.7 : 0.8;
    utterance.pitch = 1.3;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // Load quiz
  useEffect(() => {
    const currentLang = i18n.language || 'en';
    const langKey = currentLang.startsWith('si') ? 'si' : 'en';
    const ids = queryParams.get("ids")?.split(",");

    if (QUIZ_DATA[grade] && QUIZ_DATA[grade][langKey]) {
      let data = QUIZ_DATA[grade][langKey];
      if (isDemo) {
        if (ids) {
          data = data.filter(q => ids.includes(q.id));
        } else {
          data = data.slice(0, 2);
        }
      }
      setQuizData(data);
    } else {
      console.error(`No quiz data found for grade ${grade} and language ${langKey}`);
      // Fallback or navigate away
    }
  }, [grade, i18n.language, isDemo]);

  // Phase control
  useEffect(() => {
    if (!quizData.length || finished) return;

    setPhase("show");
    setStartTime(performance.now());

    const q = quizData[current];

    // Auto-play instruction
    const timerAudio = setTimeout(() => {
      speak(q.instruction, false);
    }, 500);

    const showTimer = setTimeout(() => setPhase("blur"), 2000);
    const blurTimer = setTimeout(() => setPhase("answer"), 3000);

    return () => {
      clearTimeout(timerAudio);
      clearTimeout(showTimer);
      clearTimeout(blurTimer);
      window.speechSynthesis.cancel();
    };
  }, [current, quizData, finished]);

  // Handle answer
  const handleSubmit = async (userAnswer) => {
    const q = quizData[current];
    const timeTaken = Math.round(performance.now() - startTime);

    let isCorrect = false;
    let errorType = "incorrect";

    if (q.type === "SEQUENCE_MEMORY") {
      if (q.options) {
        isCorrect = String(userAnswer).trim() === String(q.correct).trim();
        errorType = isCorrect ? "correct" : "incorrect";
      } else {
        const correct = q.sequence.map(String);
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correct);
        errorType = analyzeSequenceError(correct, userAnswer.join(""));
      }
    }

    if (q.type === "WORD_MEMORY") {
      if (q.options) {
        isCorrect = String(userAnswer).trim() === String(q.correct).trim();
        errorType = isCorrect ? "correct" : "wrong_order";
      } else {
        const correct = q.words;
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correct);
        errorType = isCorrect ? "correct" : "wrong_order";
      }
    }

    if (q.category === "Instruction") {
      // Evaluation for DragDrop array of length 1 against single q.correct
      isCorrect = String(userAnswer[0]).trim() === String(q.correct).trim();
      errorType = isCorrect ? "correct" : "wrong_order";
    }

    if (q.category === "Pattern") {
      isCorrect = String(userAnswer).trim() === String(q.correct).trim();
      errorType = isCorrect ? "correct" : "guess";
    }

    const result = {
      questionId: q.id,
      category: q.category,
      isCorrect,
      timeTaken,
      userAnswer,
      correctAnswer:
        q.sequence || q.words || q.text || q.correct,
      errorType,
    };

    const updated = [...results, result];

    if (current < quizData.length - 1) {
      setResults(updated);
      setCurrent(current + 1);
    } else {
      setResults(updated);
      setFinished(true);
      await saveResults(updated);
    }
  };

  // Save
  const saveResults = async (finalResults) => {
    if (isDemo) return;
    const metrics = calculateWorkingMemoryMetrics(finalResults);

    await saveWorkingMemoryResult({
      studentId: localStorage.getItem("studentId"),
      grade: grade,
      questionResults: finalResults,
      metrics,
    });
  };

  if (!quizData.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-emerald-300">
      <div className="w-24 h-24 border-8 border-white border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-white font-black text-2xl animate-pulse">Powering up memory module...</p>
    </div>
  );

  if (finished) {
    const metrics = calculateWorkingMemoryMetrics(results);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-6 font-sans">
        <div className="max-w-3xl w-full bg-white rounded-[3rem] shadow-[0_20px_0_rgba(0,0,0,0.1)] p-12 text-center transform transition-all">
          <h2 className="text-6xl font-black text-slate-800 mb-8 drop-shadow-sm">{t("woo_hoo")}</h2>

          <div className="bg-yellow-400 p-8 lg:p-12 rounded-[2.5rem] mb-12 shadow-inner border-b-8 border-yellow-500">
            <p className="text-2xl text-yellow-900 uppercase tracking-widest font-black mb-4">{t("final_score_label")}</p>
            <div className="text-7xl lg:text-9xl font-black text-white drop-shadow-md mb-4">{metrics.finalScore.toFixed(0)}</div>
            <p className="text-xl text-yellow-900 font-bold uppercase tracking-wider rounded-full bg-white/30 inline-block px-6 py-2">
              {t("risk_level_label")} {metrics.riskLevel}
            </p>
          </div>

          {metrics.weakAreas?.length > 0 && (
            <div className="text-left bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-100 mb-8 max-h-48 overflow-y-auto">
              <h3 className="text-xl font-black text-slate-700 mb-3 uppercase tracking-wider text-center">{t("practice_label")}</h3>
              <ul className="list-disc list-inside text-slate-600 font-bold text-lg max-w-sm mx-auto">
                {metrics.weakAreas.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 mt-8">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xl py-6 rounded-[2rem] transition-all border-b-8 border-slate-200 active:border-b-0 active:translate-y-2 uppercase"
            >
              {t("play_again")}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black text-xl py-6 rounded-[2rem] transition-all border-b-8 border-sky-600 active:border-b-0 active:translate-y-2 uppercase shadow-xl"
            >
              {t("back_home")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = quizData[current];
  const prepText = getCategoryPrefix(q.category, t);

  return (
    <div
      className="h-screen w-full flex flex-col items-center font-sans overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/images/workingMemory/identify/working-memory-identify-quiz-bg.jpeg')" }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-sky-900/10 backdrop-blur-[2px]"></div>

      <div className="w-full max-w-6xl flex justify-center items-center mb-1 px-6 z-10 mt-2">
        <div className="flex gap-2 bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30 shadow-lg flex-wrap justify-center">
          {quizData.map((_, i) => (
            <div key={i} className={`w-8 h-8 flex items-center justify-center transition-all duration-500 ${i <= current ? 'scale-110 drop-shadow-md' : 'opacity-40 scale-90'}`}>
              <span className="text-2xl">{i < current ? '⭐' : i === current ? '✨' : '⚪'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl w-full flex-1 bg-white/30 backdrop-blur-xl rounded-[3rem] shadow-2xl p-3 md:p-6 relative overflow-hidden border border-white/40 transition-all flex flex-col mt-1 z-10">

        <div className="flex justify-between items-center mb-3 px-4">
          <div className="bg-amber-100 text-amber-700 px-5 py-1.5 rounded-full font-black text-xs tracking-widest uppercase border-b-4 border-amber-200">
            {q.category}
          </div>
          <div className="text-amber-900 font-black text-base">
            {t("quest")} {current + 1} / {quizData.length}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start gap-6 min-h-0">

          {/* TOP SECTION: Instruction */}
          <div className="w-full flex flex-col items-center text-center">
            <div className="text-xl lg:text-2xl font-black text-amber-700 mb-1 drop-shadow-sm leading-tight">
              {phase === "show" ? prepText : q.instruction}
            </div>
          </div>

          {/* BOTTOM SECTION: Interaction Area */}
          <div className="w-full flex-1 flex items-center justify-center p-2 bg-white/20 backdrop-blur-lg rounded-[2.5rem] shadow-2xl relative overflow-y-auto min-h-[200px] border border-white/30">

            {/* --- PATTERN FLOW --- */}
            {q.category === "Pattern" ? (
              <div className="w-full animate-fadeIn text-center flex flex-col items-center justify-center h-full">
                <div className="bg-amber-50/40 backdrop-blur-md p-6 lg:p-10 rounded-[2.5rem] inline-block border border-amber-200/50 shadow-2xl mb-6 transform transition-transform min-w-[180px]">
                  <div className="text-4xl lg:text-6xl drop-shadow-lg font-black text-amber-500 tracking-wider">
                    {q.text}
                  </div>
                </div>
                {phase === "answer" && (
                  <div className="w-full animate-fadeIn text-center">
                    <div className="grid grid-cols-2 gap-6 w-full max-w-4xl px-4 pl-20 lg:pl-40 justify-items-center">
                      {q.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmit(opt)}
                          className={`bg-amber-600 p-6 lg:p-10 rounded-[1.5rem] border-b-6 border-black/10 hover:scale-105 active:scale-95 transition-all shadow-xl font-black text-3xl text-white w-full max-w-[400px] ${i === 2 && q.options.length === 3 ? 'col-span-2' : ''
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- STANDARD LOGIC FOR OTHERS --- */
              <React.Fragment>
                {/* SHOW */}
                {phase === "show" && (
                  <div className="w-full animate-fadeIn text-center">
                    <div className="bg-amber-50/40 backdrop-blur-md p-8 lg:p-12 rounded-[2.5rem] inline-block border border-amber-200/50 shadow-2xl transform hover:scale-105 transition-transform max-w-full">
                      {q.category === "Instruction" ? (
                        <div className="text-2xl lg:text-4xl mb-3 drop-shadow-lg font-black text-amber-500 tracking-wider flex flex-col gap-2 items-center line-clamp-none">
                          {q.text.split(",").map((s, i) => (
                            <div key={i}>{i + 1}. {s.trim()}</div>
                          ))}
                        </div>
                      ) : q.category === "Word Memory" && q.words ? (
                        <div className="flex flex-wrap justify-center gap-4 lg:gap-10 items-end mb-2 w-full max-w-full px-2">
                          {q.words.map((word, idx) => {
                            const imgName = wordToImageMap[word] || wordToImageMap[word.toLowerCase()];
                            return (
                              <div key={idx} className="flex flex-col items-center gap-2 animate-fadeIn shrink-0">
                                {imgName && (
                                  <img
                                    src={`/images/workingMemory/identify/${imgName}`}
                                    alt={word}
                                    className="w-28 h-28 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
                                  />
                                )}
                                <div className="text-xl lg:text-3xl font-black text-amber-500 drop-shadow-lg">
                                  {word}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`mb-3 drop-shadow-lg font-black text-amber-500 tracking-wider break-words max-w-full overflow-hidden ${q.category === "Word Memory" ? "text-2xl lg:text-4xl" : "text-4xl lg:text-6xl"
                          }`}>
                          {q.sequence?.join(" ") || q.words?.join(", ") || q.text || ""}
                        </div>
                      )}
                      <p className="font-black text-xl lg:text-2xl text-amber-900/60 uppercase tracking-widest mt-4 drop-shadow-sm">{t("look_closely")}</p>
                    </div>
                  </div>
                )}

                {/* BLUR */}
                {phase === "blur" && (
                  <div className="w-full animate-fadeIn text-center">
                    <div className="bg-amber-50/40 backdrop-blur-md p-8 lg:p-12 rounded-[2.5rem] inline-block border border-amber-200/50 shadow-2xl max-w-full">
                      {q.category === "Instruction" ? (
                        <div className="text-2xl lg:text-4xl mb-3 drop-shadow-md font-black text-amber-600/40 tracking-wider blur-md filter flex flex-col gap-2 items-center">
                          {q.text.split(",").map((s, i) => (
                            <div key={i}>{i + 1}. {s.trim()}</div>
                          ))}
                        </div>
                      ) : (
                        <div className={`mb-3 drop-shadow-md font-black text-amber-600/40 tracking-wider blur-md filter break-words max-w-full overflow-hidden ${q.category === "Word Memory" ? "text-2xl lg:text-4xl" : "text-4xl lg:text-6xl"
                          }`}>
                          {q.sequence?.join(" ") || q.words?.join(", ") || q.text || ""}
                        </div>
                      )}
                      <p className="font-black text-xl lg:text-2xl text-amber-900/40 uppercase tracking-widest mt-4 animate-pulse">{t("remembering")}</p>
                    </div>
                  </div>
                )}

                {/* ANSWER */}
                {phase === "answer" && (
                  <div className="w-full animate-fadeIn flex justify-center">

                    {q.type === "SEQUENCE_MEMORY" && (
                      q.options ? (
                        <div className="w-full animate-fadeIn text-center">
                          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto px-4 pl-20 lg:pl-40">
                            {q.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => handleSubmit(opt)}
                                className="bg-white hover:bg-amber-50 p-5 rounded-[1.5rem] border-4 border-amber-100 hover:border-amber-300 transition-all shadow-md font-bold text-xl lg:text-2xl text-amber-900 text-left flex items-center gap-4"
                              >
                                <span className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 font-black">{i + 1}</span>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <DragDrop items={q.sequence.map(String)} onSubmit={handleSubmit} />
                      )
                    )}

                    {q.type === "WORD_MEMORY" && (
                      q.options ? (
                        <div className="w-full animate-fadeIn text-center">
                          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto px-4 pl-20 lg:pl-40">
                            {q.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => handleSubmit(opt)}
                                className="bg-white hover:bg-amber-50 p-5 rounded-[1.5rem] border-4 border-amber-100 hover:border-amber-300 transition-all shadow-md font-bold text-xl lg:text-2xl text-amber-900 text-left flex items-center gap-4"
                              >
                                <span className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 font-black">{i + 1}</span>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <DragDrop items={q.words} onSubmit={handleSubmit} />
                      )
                    )}

                    {q.category === "Instruction" && (
                      <DragDrop items={q.options} numSlots={1} onSubmit={handleSubmit} />
                    )}

                  </div>
                )}
              </React.Fragment>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-3 pt-3 flex items-center justify-between border-t border-white/20 flex-shrink-0 z-10 relative">
          <button
            onClick={() => speak(q.instruction)}
            className="w-8 h-8 flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-[0_3px_0_rgb(180,83,9)] flex items-center justify-center transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none"
            title="Hear instruction"
          >
            <span className="text-base relative top-[-1px]">🔊</span>
          </button>

          <p className="text-amber-900/60 font-black text-xs uppercase tracking-[0.3em] absolute left-1/2 -translate-x-1/2">
            {t("build_strong_memory")}
          </p>

          <div className="flex gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-200 animate-bounce"></div>
            <div className="w-3 h-3 rounded-full bg-orange-200 animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-200 animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        /* Custom drag ghost style */
        [draggable=true] {
          cursor: grab;
        }
        [draggable=true]:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}