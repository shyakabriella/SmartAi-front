// src/components/RatingStars.jsx
export default function RatingStars({ value }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1 text-[11px] text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
      <span className="ml-1 text-[11px] text-slate-500">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
