export function StatusBar({ ink }) {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-medium" style={{ color: ink }}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-2 border rounded-[1px]" style={{ borderColor: ink }} />
      </span>
    </div>
  );
}
