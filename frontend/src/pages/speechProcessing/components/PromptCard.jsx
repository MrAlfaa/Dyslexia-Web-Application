function PromptCard({ prompt }) {
  const isSentence = prompt?.taskType === "sentence_read";

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-white p-7 text-center shadow-2xl shadow-emerald-100/70 ring-1 ring-white">
      <div className="absolute left-6 top-6 text-3xl" aria-hidden="true">
        {isSentence ? "📖" : "🎤"}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
        {prompt?.instructionEn || "Say the word"}
      </p>
      <h1
        className={`mt-6 break-words font-black tracking-tight text-slate-950 ${
          isSentence ? "text-4xl sm:text-5xl" : "text-7xl sm:text-8xl"
        }`}
      >
        {prompt?.targetText}
      </h1>
      <p className="mt-5 text-xl font-black text-amber-700">
        {prompt?.instructionSi || "වචනය බලලා කියන්න"}
      </p>
    </section>
  );
}

export default PromptCard;
