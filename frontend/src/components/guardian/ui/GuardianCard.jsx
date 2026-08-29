function GuardianCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-[#E2E8E4] bg-white p-5 shadow-[0_8px_24px_rgba(16,36,30,0.055)] md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export default GuardianCard;
