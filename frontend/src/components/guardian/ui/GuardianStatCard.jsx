function GuardianStatCard({ label, value, helper, tone = "emerald" }) {
  const tones = {
    emerald: "border-[#D8ECE3] bg-[#F3FBF7]",
    amber: "border-[#F4E4BE] bg-[#FFFAEF]",
    sky: "border-[#D8EAF7] bg-[#F3FAFF]",
    slate: "border-[#E5EDE7] bg-white",
  };

  return (
    <article className={`rounded-[20px] border p-4 shadow-[0_10px_28px_rgba(16,36,30,0.045)] ${tones[tone] || tones.emerald}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">
        {label}
      </p>
      <div className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#101828]">{value}</div>
      {helper && <p className="mt-1 text-xs font-medium leading-5 text-[#5B6475]">{helper}</p>}
    </article>
  );
}

export default GuardianStatCard;
