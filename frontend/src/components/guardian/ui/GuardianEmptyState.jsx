function GuardianEmptyState({ title = "Nothing to show yet", message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[#BFD7CB] bg-[#F4F8F6] p-6 text-center sm:p-8">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[10px] bg-white text-lg font-bold text-[#157A5A] ring-1 ring-[#DCE8E2]">
        L
      </div>
      <h3 className="mt-4 text-xl font-bold text-[#101828]">{title}</h3>
      {message && (
        <p className="mx-auto mt-2 max-w-xl text-[15px] font-normal leading-6 text-[#5B6475]">
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default GuardianEmptyState;
