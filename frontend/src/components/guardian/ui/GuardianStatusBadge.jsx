const supportLabels = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
  unknown: "Unknown",
};

const statusLabels = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  locked: "Locked",
  current: "Current",
  recommended: "Recommended",
};

function GuardianStatusBadge({ value, type = "status" }) {
  const label = type === "support" ? supportLabels[value] || "Unknown" : statusLabels[value] || value || "Unknown";
  const tone =
    value === "completed" || value === "low_support"
      ? "bg-[#EAF7F0] text-[#0F5F48] ring-[#CFE9DC]"
      : value === "in_progress" || value === "medium_support" || value === "current" || value === "recommended"
        ? "bg-[#FFF6DF] text-[#94600A] ring-[#F4E4BE]"
        : value === "high_support"
          ? "bg-[#FFF0F0] text-[#B42318] ring-[#F4C7C7]"
          : "bg-[#F5F7F6] text-[#5B6475] ring-[#E5EDE7]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

export default GuardianStatusBadge;
