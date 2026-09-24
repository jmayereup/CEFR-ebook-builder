import { useCallback, useEffect, useState } from 'react';

interface UseToastAutoDismissOptions {
  isActive: boolean;
  isExpanded: boolean;
  isHovered: boolean;
  onDismiss: () => void;
  timeoutMs?: number;
}

export function useToastAutoDismiss({
  isActive,
  isExpanded,
  isHovered,
  onDismiss,
  timeoutMs = 5000,
}: UseToastAutoDismissOptions) {
  const [activityKey, setActivityKey] = useState<number>(0);

  const resetActivityTimer = useCallback(() => {
    setActivityKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isActive || isExpanded || isHovered) return;

    // Depend on activityKey so interactions restart the dismiss countdown
    if (activityKey < 0) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isActive, isExpanded, isHovered, activityKey, timeoutMs, onDismiss]);

  return { resetActivityTimer };
}
