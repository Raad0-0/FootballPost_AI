import { useEffect, useState } from "react";
import { fetchLiveMatchNow } from "../api/matches";
import type { Match } from "../types/match";

export function useLiveMatch(workspaceId: number | string, initialMatch?: Match | null) {
  const [match, setMatch] = useState<Match | null | undefined>(initialMatch);
  const [fetching, setFetching] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer for manual fetch cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const triggerFetchNow = async () => {
    if (cooldownSeconds > 0 || fetching) return;
    setFetching(true);
    setError(null);
    setMessage(null);

    try {
      const result = await fetchLiveMatchNow(workspaceId);
      if (result.match) {
        setMatch(result.match);
      }
      setMessage(result.message);
      // Start 45s local cooldown
      setCooldownSeconds(45);
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to fetch live updates");
      // If error mentions wait time, extract seconds if possible
      const matchCooldown = err.message?.match(/wait (\d+) seconds/i);
      if (matchCooldown) {
        setCooldownSeconds(parseInt(matchCooldown[1], 10));
      }
    } finally {
      setFetching(false);
    }
  };

  return {
    match,
    setMatch,
    fetching,
    cooldownSeconds,
    message,
    error,
    triggerFetchNow,
  };
}

