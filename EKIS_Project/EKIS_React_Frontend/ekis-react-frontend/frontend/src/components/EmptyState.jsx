export default function EmptyState({ title = "Nothing here yet", text }) {
  return (
    <div className="state-box empty-state">
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}