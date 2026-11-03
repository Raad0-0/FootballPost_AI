import React from "react";
import { useApiUsage } from "../hooks/useApiUsage";
import { getQuotaVisuals } from "../utils/quota";

export const ApiUsageBadge: React.FC = () => {
  const { usage } = useApiUsage();

  if (!usage) return null;

  const visuals = getQuotaVisuals(usage.status);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${visuals.badgeBg}`}
      title={usage.warning_message || `API usage: ${usage.used_today} of ${usage.daily_limit} calls today`}
    >
      <span>{visuals.icon}</span>
      <span>
        {usage.used_today}/{usage.daily_limit} API calls
      </span>
      {usage.status !== "ok" && (
        <span className="uppercase text-[10px] tracking-wider font-semibold ml-0.5">
          ({visuals.label})
        </span>
      )}
    </div>
  );
};

