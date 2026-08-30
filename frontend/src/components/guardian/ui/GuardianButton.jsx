function GuardianButton({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-[#157A5A] text-white hover:bg-[#0F5F48] border-transparent shadow-[0_10px_24px_rgba(21,122,90,0.18)]",
    secondary:
      "bg-white text-[#101828] hover:bg-[#F5F7F6] border-[#E5EDE7]",
    danger:
      "bg-[#FFF0F0] text-[#B42318] hover:bg-[#FFE7E7] border-[#F4C7C7]",
    ghost:
      "bg-transparent text-[#5B6475] hover:bg-[#F5F7F6] border-transparent",
  };

  return (
    <button
      type="button"
      className={`guardian-focus inline-flex min-h-10 items-center justify-center rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default GuardianButton;
