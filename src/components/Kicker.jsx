export function Kicker({ text, accent }) {
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-widest uppercase px-0"
      style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
    >
      {text}
    </span>
  );
}
