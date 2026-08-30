function GuardianStatCard({ label, value, helper, tone = "emerald" }) {
  const tones = {
    emerald: "bg-[#EFF8F3]",
    amber: "bg-[#FFF7E6]",
    sky: "bg-[#EEF7FC]",
    slate: "bg-[#F4F6F5]",
  };

  return (
    <article className={`min-h-[96px] rounded-lg border border-black/[0.035] p-3.5 ${tones[tone] || tones.emerald}`}>
      <p className="text-xs font-semibold text-[#475467]">
        {label}
      </p>
      <div className="mt-1.5 break-words text-lg font-bold leading-tight text-[#101828]">{value}</div>
      {helper && <p className="mt-1 text-xs font-normal leading-[18px] text-[#5B6475]">{helper}</p>}
    </article>
  );
}

export default GuardianStatCard;
