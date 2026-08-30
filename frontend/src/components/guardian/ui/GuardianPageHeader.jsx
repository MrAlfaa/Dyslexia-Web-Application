function GuardianPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold text-[#157A5A]">
            {eyebrow}
          </p>
        )}
        <h2 className={`${eyebrow ? "mt-1" : ""} text-2xl font-bold leading-tight text-[#101828]`}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-sm font-normal leading-5 text-[#5B6475]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex min-h-10 flex-wrap items-end gap-2">{actions}</div>}
    </div>
  );
}

export default GuardianPageHeader;
