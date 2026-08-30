function GuardianCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-[#DCE5E0] bg-white p-4 shadow-[0_4px_14px_rgba(16,36,30,0.045)] md:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export default GuardianCard;
