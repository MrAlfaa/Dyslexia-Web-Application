function GuardianSelect({ label, className = "", children, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">
          {label}
        </span>
      )}
      <select
        className="guardian-focus w-full rounded-2xl border border-[#E5EDE7] bg-white px-4 py-3 text-sm font-semibold text-[#101828] outline-none transition focus:border-[#157A5A]"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export default GuardianSelect;
