type Props = {
  focusMin: number;
  onFocusChange: (next: number) => void;
  breakMin: number;
  onBreakChange: (next: number) => void;
  rounds: number;
  onRoundsChange: (next: number) => void;
};

export function SettingsExtras({
  focusMin,
  onFocusChange,
  breakMin,
  onBreakChange,
  rounds,
  onRoundsChange,
}: Props) {
  return (
    <>
      <label>
        <span>Focus minutes</span>
        <input
          type="number"
          min={1}
          max={120}
          step={1}
          value={focusMin}
          onChange={(e) => onFocusChange(Math.max(1, Number(e.target.value) || 25))}
        />
      </label>

      <label>
        <span>Break minutes</span>
        <input
          type="number"
          min={1}
          max={60}
          step={1}
          value={breakMin}
          onChange={(e) => onBreakChange(Math.max(1, Number(e.target.value) || 5))}
        />
      </label>

      <label>
        <span>Rounds</span>
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={rounds}
          onChange={(e) => onRoundsChange(Math.max(1, Number(e.target.value) || 3))}
        />
      </label>

      <p className="settings-help">
        Settings only affect <em>new</em> sessions. To re-apply, restart the timer from the
        pre-start screen.
      </p>
    </>
  );
}
