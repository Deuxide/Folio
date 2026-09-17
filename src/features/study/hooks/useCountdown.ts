import { useEffect, useState } from "react";
import { getRemainingMs } from "@/features/study/timer";

export function useCountdown(deadlineIso: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadlineIso) {
      return;
    }

    const tick = () => {
      setNow(Date.now());
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [deadlineIso]);

  return getRemainingMs(deadlineIso, now);
}
