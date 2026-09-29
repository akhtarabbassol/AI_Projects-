export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className="state-box">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}