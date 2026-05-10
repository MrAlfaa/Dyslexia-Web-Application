const SpeechResultCard = ({ result, completion }) => {
  if (!result && !completion) return null;

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-emerald-100 ring-1 ring-slate-100">
      <h3 className="text-2xl font-black text-slate-900">Great try!</h3>

      {result && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-sky-600">
              Pronunciation Score
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {Math.round((result.itemResult?.pronunciationScore || 0) * 100)}%
            </p>
          </div>
          <div className="rounded-2xl bg-yellow-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-yellow-700">
              Stars Earned
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {result.itemResult?.starsEarned || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-teal-50 p-4 sm:col-span-2">
            <p className="text-xs font-black uppercase tracking-widest text-teal-700">
              Sound practice
            </p>
            <p className="mt-2 text-base font-bold text-slate-700">
              {result.itemResult?.supportHint ||
                "Let's practice this sound again."}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Audio check
            </p>
            <p className="mt-2 text-sm font-bold text-slate-700">
              Valid audio: {result.itemResult?.validAudio ? "Yes" : "No"} |
              Word correct: {result.itemResult?.wordCorrect ? "Yes" : "Keep practicing"}
            </p>
          </div>
        </div>
      )}

      {completion && (
        <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Great work!
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            You earned stars.
          </p>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Your guardian can see your progress.
          </p>
          <p className="mt-4 text-sm font-black text-slate-700">
            Practice ideas
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {completion.recommendations?.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechResultCard;
