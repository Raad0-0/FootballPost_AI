import { useEffect, useState } from "react";
import { getApiUsage } from "../api/usage";
import type { ApiUsage } from "../types/usage";

export function useApiUsage() {
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    try {
      const data = await getApiUsage();
      setUsage(data);
    } catch {
      // Fallback silently if unauthenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Refresh quota every 60 seconds
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  return { usage, loading, refresh: fetchUsage };
}

