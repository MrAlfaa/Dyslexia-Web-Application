function GuardianEmptyState({ title = "Nothing to show yet", message, action }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#CFE3D8] bg-[#F3FBF7] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-[#157A5A] shadow-sm">
        L
      </div>
      <h3 className="mt-4 text-lg font-bold text-[#101828]">{title}</h3>
      {message && (
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[#5B6475]">
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default GuardianEmptyState;
