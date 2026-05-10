function GuardianModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10241E]/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-[#101828]">{title}</h3>
            {subtitle && <p className="mt-1 text-sm font-medium text-[#5B6475]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="guardian-focus rounded-2xl bg-[#F5F7F6] px-4 py-2 text-sm font-semibold text-[#101828] transition hover:bg-[#EAF7F0]"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export default GuardianModal;
