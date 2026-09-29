import { useEffect, useState } from "react";

type Props = {
  value: number | null;
  min: number;
  max: number;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  stopClick?: boolean;
  onCommit: (value: number) => void;
};

export function CommitNumberInput({ value, min, max, className, ariaLabel, disabled, stopClick, onCommit }: Props) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(parsed)));
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <input
      className={className}
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      value={draft}
      disabled={disabled}
      onClick={(event) => { if (stopClick) event.stopPropagation(); }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
    />
  );
}
