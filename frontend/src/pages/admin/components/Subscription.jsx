import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { devChangeSubscriptionPlan, getMySubscription } from "../../../services/admin/api";
import GuardianPageHeader from "../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../components/guardian/ui/GuardianCard";
import GuardianStatCard from "../../../components/guardian/ui/GuardianStatCard";
import GuardianButton from "../../../components/guardian/ui/GuardianButton";

const plans = [
  { value: "individual", label: "Individual", limit: 1, description: "For one child starting LexiLand." },
  { value: "plus", label: "Plus", limit: 5, description: "For families or small support groups." },
  { value: "premium", label: "Premium", limit: 100, description: "For larger learning centers." },
];

function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = user.role === "super admin";

  const loadSubscription = async () => {
    try {
      const response = await getMySubscription();
      setSubscription(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load subscription");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const changePlan = async (plan) => {
    try {
      await devChangeSubscriptionPlan(plan);
      toast.success("Development plan updated");
      loadSubscription();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update plan");
    }
  };

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  const used = subscription?.childrenUsed || 0;
  const limit = subscription?.childLimit || 1;
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Subscription"
        subtitle="Review your child limit and available LexiLand plans."
      />

      <GuardianCard>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[#157A5A]">Current Plan</p>
            <h3 className="mt-2 text-2xl font-bold text-[#101828]">
              {subscription?.subscriptionLabel || "Individual"}
            </h3>
            <p className="mt-2 text-sm font-medium text-[#5B6475]">
              {used} of {limit} child profiles are currently used.
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E5EDE7]">
              <div className="h-full rounded-full bg-[#157A5A]" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <GuardianStatCard label="Plan Status" value={subscription?.subscriptionStatus || "trial"} tone="emerald" />
            <GuardianStatCard label="Children Used" value={`${used}/${limit}`} tone="amber" />
          </div>
        </div>
      </GuardianCard>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const active = subscription?.subscriptionPlan === plan.value;
          return (
            <GuardianCard
              key={plan.value}
              className={`relative overflow-hidden ${active ? "border-[#157A5A] ring-2 ring-[#D8ECE3]" : ""}`}
            >
              {active && (
                <span className="absolute right-4 top-4 rounded-full bg-[#EAF7F0] px-3 py-1 text-xs font-semibold text-[#0F5F48]">
                  Current
                </span>
              )}
              <h3 className="text-xl font-bold text-[#101828]">{plan.label}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[#5B6475]">{plan.description}</p>
              <p className="mt-5 text-3xl font-extrabold tracking-[-0.03em] text-[#101828]">
                {plan.limit}
                {" "}
                <span className="ml-2 text-sm font-semibold tracking-normal text-[#5B6475]">
                  child{plan.limit > 1 ? "ren" : ""}
                </span>
              </p>
              <GuardianButton
                className="mt-6 w-full"
                variant={active ? "secondary" : "primary"}
                onClick={() => (isSuperAdmin ? changePlan(plan.value) : undefined)}
              >
                {isSuperAdmin ? "Set Plan For Development" : "Upgrade coming soon"}
              </GuardianButton>
            </GuardianCard>
          );
        })}
      </section>

      {isSuperAdmin && (
        <GuardianCard className="bg-[#F8FBF8]">
          <p className="text-sm font-semibold text-[#101828]">Developer testing</p>
          <p className="mt-1 text-sm font-medium text-[#5B6475]">
            Plan changes here are local development controls only. Payment integration is intentionally out of scope.
          </p>
        </GuardianCard>
      )}
    </div>
  );
}

export default Subscription;
