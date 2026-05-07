import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { QUIZ_DATA } from './quizData';
import { calculatePhonologicalMetrics } from '../../utils/phonologicalAwareness/scoring.util';

// --- SUB-COMPONENTS (Polished for Children) ---

const MultipleChoiceDisplay = ({ question, onNext }) => {
  const colors = ['bg-yellow-400', 'bg-pink-400', 'bg-sky-400', 'bg-lime-400'];
  return (
    <div className="w-full animate-fadeIn text-center">
      <div className="flex flex-row flex-wrap justify-center gap-6 max-w-5xl mx-auto px-4">
        {question.options.map((opt, i) => {
          const isMirrored = typeof opt === 'string' && opt.startsWith('MIRROR:');
          const displayOpt = isMirrored ? opt.replace('MIRROR:', '') : opt;
          return (
            <button
              key={i}
              onClick={() => onNext(opt === question.correct, opt)}
              className={`${colors[i % colors.length]} w-48 lg:w-64 py-6 lg:py-8 rounded-[2rem] border-b-8 border-black/10 hover:scale-105 active:scale-95 transition-all shadow-xl font-black text-4xl lg:text-6xl text-white flex items-center justify-center`}
            >
              <span className={isMirrored ? 'scale-x-[-1] inline-block' : ''}>
                {displayOpt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TokenCountDisplay = ({ question, onNext }) => {
  const { t } = useTranslation('pa');
  const [selected, setSelected] = useState(null);
  return (
    <div className="flex flex-col items-center animate-fadeIn w-full px-4">
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => setSelected(num)}
            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full border-b-8 border-black/10 text-4xl lg:text-5xl font-black transition-all flex items-center justify-center shadow-lg ${selected === num
              ? 'bg-purple-500 text-white scale-110 z-10'
              : 'bg-white text-purple-400 hover:bg-purple-50'
              }`}
          >
            <span className={selected === num ? 'animate-bounce' : ''}>{num}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => onNext(selected === question.correct, selected)}
        disabled={selected === null}
        className="bg-orange-500 hover:bg-orange-600 text-white text-xl lg:text-2xl px-12 py-4 rounded-full font-black shadow-[0_6px_0_rgb(194,65,12)] uppercase tracking-wider disabled:opacity-30 transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none"
      >
        {t("thats_my_count")}
      </button>
    </div>
  );
};

const ImageSelectDisplay = ({ question, onNext }) => (
  <div className="w-full animate-fadeIn text-center">
    <div className="flex flex-row flex-wrap justify-center gap-6 max-w-6xl mx-auto">
      {question.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onNext(opt.isCorrect, opt.text)}
          className="bg-white p-4 lg:p-6 rounded-[2rem] border-b-[8px] border-slate-200 hover:border-sky-400 hover:bg-sky-50 transition-all shadow-xl group transform hover:-translate-y-1 active:translate-y-0 active:border-b-0 min-w-[180px]"
        >
          <div className="h-32 lg:h-40 flex items-center justify-center mb-2 overflow-visible">
            <img
              src={opt.img}
              alt={opt.text}
              className="h-full object-contain group-hover:scale-[3] transition-transform duration-300 cursor-zoom-in relative z-20"
            />
          </div>
          <p className="font-black text-slate-600 text-lg lg:text-xl uppercase tracking-widest">{opt.text}</p>
        </button>
      ))}
    </div>
  </div>
);

const DragAndDropDisplay = ({ question, onNext }) => {
  const { t } = useTranslation('pa');
  const [slots, setSlots] = useState(Array(question.parts.length).fill(null));
  const [available, setAvailable] = useState([...question.options]);

  const handleDrop = (item, slotIndex) => {
    const newSlots = [...slots];
    const prevItem = newSlots[slotIndex];
    newSlots[slotIndex] = item;

    let newAvailable = [...available];
    if (prevItem) newAvailable.push(prevItem);
    newAvailable = newAvailable.filter(i => i !== item);

    setSlots(newSlots);
    setAvailable(newAvailable);
  };

  const resetSlot = (slotIndex) => {
    const item = slots[slotIndex];
    if (!item) return;
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
    setAvailable([...available, item]);
  };

  return (
    <div className="flex flex-col items-center animate-fadeIn w-full px-4 justify-center">
      <div className="flex gap-4 mb-8">
        {slots.map((slot, i) => (
          <div
            key={i}
            onClick={() => resetSlot(i)}
            className={`w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center border-4 lg:border-8 border-dashed rounded-[1.5rem] text-4xl font-black cursor-pointer transition-all ${slot
              ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-inner scale-105'
              : 'border-slate-200 bg-slate-50 text-slate-200 hover:border-indigo-200'
              }`}
          >
            {slot || "?"}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {available.map((option, i) => (
          <button
            key={i}
            onClick={() => {
              const emptySlot = slots.findIndex(s => s === null);
              if (emptySlot !== -1) handleDrop(option, emptySlot);
            }}
            className="px-8 py-4 bg-white border-b-6 border-slate-200 rounded-[1.5rem] text-4xl font-black text-slate-700 hover:border-indigo-400 hover:text-indigo-500 shadow-md transition-all hover:-translate-y-1 active:translate-y-1"
          >
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={() => onNext(JSON.stringify(slots) === JSON.stringify(question.correct), slots)}
        disabled={slots.includes(null)}
        className="bg-indigo-500 hover:bg-indigo-600 text-white text-xl px-12 py-4 rounded-full font-black shadow-[0_6px_0_rgb(67,56,202)] uppercase tracking-wider disabled:opacity-30 transition-all"
      >
        {t("mix_them_up")}
      </button>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function IdentificationActivities() {
  const { grade } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('pa');

  const queryParams = new URLSearchParams(location.search);
  const isDemo = queryParams.get("demo") === "true";
  const [quizData, setQuizData] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audio Logic
  const speak = (text, isSlow = true) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'si' ? 'si-LK' : 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(i18n.language)) || voices[0];
    utterance.voice = voice;
    utterance.rate = isSlow ? 0.6 : 0.5;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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
      navigate('/dashboard');
    }
    setLoading(false);
  }, [grade, i18n.language, navigate, isDemo]);

  useEffect(() => {
    if (quizData.length > 0 && !isFinished && quizData[currentIdx]) {
      setQuestionStartTime(performance.now());
      const timer = setTimeout(() => {
        // Disable voice for Sinhala for now
        if (i18n.language !== 'si' && i18n.language !== 'si-LK') {
          speak(quizData[currentIdx].instruction);
        }
      }, 500);
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [currentIdx, quizData, isFinished, i18n.language]);

  const handleNext = async (isCorrect, userAnswer) => {
    const endTime = performance.now();
    const timeTaken = Math.round(endTime - questionStartTime);
    const question = quizData[currentIdx];

    const newResult = {
      questionId: question.id,
      category: question.category,
      isCorrect,
      timeTaken,
      userAnswer,
      correctAnswer: question.correct || question.options?.find(o => o.isCorrect)?.text,
    };

    const updatedResults = [...results, newResult];
    const newScore = isCorrect ? score + 1 : score;

    const currentLang = i18n.language || 'en';
    const langKey = currentLang.startsWith('si') ? 'si' : 'en';

    if (currentIdx < quizData.length - 1) {
      setResults(updatedResults);
      setScore(newScore);
      setCurrentIdx(currentIdx + 1);
    } else {
      setResults(updatedResults);
      setScore(newScore);
      setIsFinished(true);
      await saveResults(updatedResults, newScore, langKey);
    }
  };

  const saveResults = async (finalResults, finalScore, langKey) => {
    if (isDemo) return;
    try {
      const metrics = calculatePhonologicalMetrics(finalResults, grade, langKey);
      const studentId = localStorage.getItem("studentId");

      await axios.post('http://localhost:5000/api/phonological-awareness/identification/save-result', {
        studentId,
        grade: grade,
        totalScore: metrics.totalCorrect, // Using raw correct count
        totalQuestions: metrics.totalQuestions,
        questionResults: finalResults,
        totalTimeTaken: metrics.totalTimeTaken,
        metrics: metrics, // Send full metrics for model training
      });
    } catch (error) {
      console.error("Error saving results:", error);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-100">
      <div className="w-24 h-24 border-8 border-white border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-sky-600 font-black text-2xl animate-pulse">{t("getting_ready")}</p>
    </div>
  );

  if (quizData.length === 0) return null;

  const currentQuestion = quizData[currentIdx];

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-6 font-sans">
        <div className="max-w-3xl w-full bg-white rounded-[3rem] shadow-[0_20px_0_rgba(0,0,0,0.1)] p-12 text-center transform transition-all">
          <h2 className="text-6xl font-black text-slate-800 mb-8 drop-shadow-sm">{t("woo_hoo")}</h2>

          <div className="bg-yellow-400 p-12 rounded-[2.5rem] mb-12 shadow-inner border-b-8 border-yellow-500">
            <p className="text-2xl text-yellow-900 uppercase tracking-widest font-black mb-4">{t("final_stars")}</p>
            <div className="text-9xl font-black text-white drop-shadow-md">{score} / {quizData.length}</div>
            <p className="text-xl text-yellow-900 font-bold uppercase tracking-wider rounded-full bg-white/30 inline-block px-6 py-2 mt-4">
              Risk Level: {calculatePhonologicalMetrics(results, grade, (i18n.language || 'en').startsWith('si') ? 'si' : 'en').riskLevel}
            </p>
          </div>

          {calculatePhonologicalMetrics(results, grade, (i18n.language || 'en').startsWith('si') ? 'si' : 'en').weakAreas?.length > 0 && (
            <div className="text-left bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-100 mb-8 max-h-48 overflow-y-auto">
              <h3 className="text-xl font-black text-slate-700 mb-3 uppercase tracking-wider text-center">Things to practice:</h3>
              <ul className="list-disc list-inside text-slate-600 font-bold text-lg max-w-sm mx-auto">
                {calculatePhonologicalMetrics(results, grade, (i18n.language || 'en').startsWith('si') ? 'si' : 'en').weakAreas.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-2xl py-6 rounded-[2rem] transition-all border-b-8 border-slate-200 active:border-b-0 active:translate-y-2 uppercase"
            >
              {t("play_again")}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black text-2xl py-6 rounded-[2rem] transition-all border-b-8 border-sky-600 active:border-b-0 active:translate-y-2 uppercase shadow-xl"
            >
              {t("back_home")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // <div className="h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300 p-2 md:p-4 flex flex-col items-center font-sans overflow-hidden">
    <div
      className="h-screen p-2 md:p-4 flex flex-col items-center font-sans overflow-hidden"
      style={{
        backgroundImage: 'url("/images/phonologicalAwareness/quiz_interaction_bg2.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-6xl flex justify-center items-center mb-2 px-6 z-10">
        <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-white/50">
          {quizData.map((_, i) => (
            <div key={i} className={`w-6 h-6 flex items-center justify-center transition-all duration-500 ${i <= currentIdx ? 'scale-110' : 'opacity-30 scale-90'}`}>
              <span className="text-lg">{i < currentIdx ? '⭐' : i === currentIdx ? '✨' : '⚪'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl w-full flex-1 bg-white/10 backdrop-blur-sm rounded-[3rem] shadow-2xl p-6 md:p-10 relative overflow-hidden border-b-[10px] border-black/10 transition-all flex flex-col">
        <div className="flex justify-between items-center mb-6 px-4">
          <div className="bg-sky-100 text-sky-600 px-6 py-1.5 rounded-full font-black text-sm tracking-tight uppercase border-b-4 border-sky-200">
            {currentQuestion.category}
          </div>
          <div className="text-black font-black text-lg italic">
            {t("quest")} {currentIdx + 1} / {quizData.length}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start gap-6 min-h-0 overflow-hidden">
          {/* Top Section: Instruction and Image */}
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 leading-tight drop-shadow-sm mb-4">
              {currentQuestion.instruction}
            </h1>

            {currentQuestion.text && (
              <div className="px-6 py-2 bg-purple-50 text-purple-600 font-black text-xl lg:text-2xl rounded-2xl border-2 border-purple-100 mb-4 tracking-[0.2em] uppercase">
                {currentQuestion.text}
              </div>
            )}

            {currentQuestion.targetImg && (
              <div className="h-28 lg:h-36 flex items-center justify-center mb-4 overflow-visible">
                <img
                  src={currentQuestion.targetImg}
                  alt="Question Hint"
                  className="h-full object-contain hover:scale-[3] transition-transform duration-300 cursor-zoom-in relative z-20"
                />
              </div>
            )}
          </div>

          {/* Bottom Section: Interaction Area */}
          <div
            className="w-full flex-1 flex items-center justify-center p-4 bg-white/5 rounded-[2.5rem] shadow-inner relative overflow-hidden border-4 border-white/30 backdrop-blur-sm"
          >
            {/* Blurred Internal Background Image */}
            <div
              className="absolute inset-0 opacity-40 blur-[2px]"
              style={{
                backgroundImage: 'url("/images/phonologicalAwareness/quiz_interaction_bg.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Subtle Overlay to ensure buttons pop */}
            <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>

            <div className="w-full max-h-full flex items-center justify-center relative z-10">
              {currentQuestion.type === "TOKEN_COUNT" && (
                <TokenCountDisplay key={currentQuestion.id} question={currentQuestion} onNext={handleNext} />
              )}
              {currentQuestion.type === "MULTIPLE_CHOICE" && (
                <MultipleChoiceDisplay key={currentQuestion.id} question={currentQuestion} onNext={handleNext} />
              )}
              {currentQuestion.type === "IMAGE_SELECT" && (
                <ImageSelectDisplay key={currentQuestion.id} question={currentQuestion} onNext={handleNext} />
              )}
              {currentQuestion.type === "DRAG_AND_DROP" && (
                <DragAndDropDisplay key={currentQuestion.id} question={currentQuestion} onNext={handleNext} />
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 flex items-center justify-between border-t border-slate-100 flex-shrink-0">
          <p className="text-slate-300 font-black text-xs uppercase tracking-[0.3em]">{t("explore_sounds")}</p>
          <div className="flex gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-200 animate-bounce"></div>
            <div className="w-3 h-3 rounded-full bg-pink-200 animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-3 h-3 rounded-full bg-lime-200 animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
}
