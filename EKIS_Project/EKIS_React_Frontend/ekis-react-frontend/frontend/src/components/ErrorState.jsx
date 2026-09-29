export default function ErrorState({ message = "Unable to load data.", onRetry }) {
  return (
    <div className="state-box error-state">
      <strong>{message}</strong>
      <span>Please try again.</span>
      {onRetry && <button className="btn-ghost-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}