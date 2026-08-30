function GuardianSelect({ label, className = "", children, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B6475]">
          {label}
        </span>
      )}
      <select
        className="guardian-focus min-h-10 w-full rounded-lg border border-[#D7E2DC] bg-white px-3 py-2 text-[13px] font-semibold text-[#101828] outline-none transition focus:border-[#157A5A]"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export default GuardianSelect;
