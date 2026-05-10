function GuardianCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-[22px] border border-[#E5EDE7] bg-white p-5 shadow-[0_14px_40px_rgba(16,36,30,0.06)] md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export default GuardianCard;
