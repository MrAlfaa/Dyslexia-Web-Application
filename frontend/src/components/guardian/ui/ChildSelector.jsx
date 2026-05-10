function ChildSelector({ childrenList = [], selectedChildId, onChange }) {
  return (
    <label className="block min-w-[240px]">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">
        Selected Child
      </span>
      <select
        value={selectedChildId}
        onChange={(event) => onChange(event.target.value)}
        className="guardian-focus w-full rounded-2xl border border-[#E5EDE7] bg-white px-4 py-3 text-sm font-semibold text-[#101828] shadow-sm outline-none transition focus:border-[#157A5A]"
      >
        {childrenList.map((child) => (
          <option key={child._id} value={child._id}>
            {child.fullName} ({child.username || "no username"})
          </option>
        ))}
      </select>
    </label>
  );
}

export default ChildSelector;
