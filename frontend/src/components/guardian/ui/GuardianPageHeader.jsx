function GuardianPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#157A5A]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.02em] text-[#101828] sm:text-[36px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#5B6475] sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export default GuardianPageHeader;
