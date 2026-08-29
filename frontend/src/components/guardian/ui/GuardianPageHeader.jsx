function GuardianPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-sm font-semibold text-[#157A5A]">
            {eyebrow}
          </p>
        )}
        <h2 className={`${eyebrow ? "mt-1" : ""} text-[28px] font-bold leading-tight text-[#101828] sm:text-[30px]`}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-3xl text-[15px] font-normal leading-6 text-[#5B6475] sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex min-h-11 flex-wrap items-end gap-2">{actions}</div>}
    </div>
  );
}

export default GuardianPageHeader;
