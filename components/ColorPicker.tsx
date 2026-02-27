export const ColorPicker = ({ label, setValue }: any) => {
  const colors = ["#22c55e","#3b82f6","#a855f7","#ef4444","#6b7280","#f97316", "#ffffff"];

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold mb-3">{label}</p>
      <div className="flex gap-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setValue(color)}
            className="w-8 h-8 rounded-full border-2"
            style={{
              backgroundColor: color,
              borderColor: "gray"
            }}
          />
        ))}
      </div>
    </div>
  );
};