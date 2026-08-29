function GuardianStatCard({ label, value, helper, tone = "emerald" }) {
  const tones = {
    emerald: "bg-[#EFF8F3]",
    amber: "bg-[#FFF7E6]",
    sky: "bg-[#EEF7FC]",
    slate: "bg-[#F4F6F5]",
  };

  return (
    <article className={`min-h-[116px] rounded-[10px] p-4 ${tones[tone] || tones.emerald}`}>
      <p className="text-sm font-semibold text-[#475467]">
        {label}
      </p>
      <div className="mt-2 break-words text-[22px] font-bold leading-tight text-[#101828]">{value}</div>
      {helper && <p className="mt-1.5 text-sm font-normal leading-5 text-[#5B6475]">{helper}</p>}
    </article>
  );
}

export default GuardianStatCard;
