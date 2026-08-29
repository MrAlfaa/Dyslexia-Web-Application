function ChildSelector({
  childrenList = [],
  selectedChildId = "",
  onChange,
  label = "Selected child",
  hideLabel = false,
  className = "",
}) {
  const hasChildren = childrenList.length > 0;

  return (
    <label className={`block min-w-[220px] ${className}`}>
      {!hideLabel && (
        <span className="mb-1.5 block text-sm font-semibold text-[#475467]">
          {label}
        </span>
      )}
      <select
        value={selectedChildId}
        onChange={(event) => onChange(event.target.value)}
        disabled={!hasChildren}
        aria-label={hideLabel ? label : undefined}
        className="guardian-focus min-h-11 w-full rounded-[10px] border border-[#D7E2DC] bg-white px-3 py-2 text-[15px] font-semibold text-[#101828] outline-none transition hover:border-[#AFCBBE] focus:border-[#157A5A] disabled:cursor-not-allowed disabled:bg-[#F2F4F3] disabled:text-[#667085]"
      >
        {!hasChildren && <option value="">No children available</option>}
        {childrenList.map((child) => (
          <option key={child._id} value={child._id}>
            {child.fullName} {child.username ? `(${child.username})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ChildSelector;
