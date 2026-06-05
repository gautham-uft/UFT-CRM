import { useTheme } from "@/contexts/ThemeContext";

export function useChartColors() {
  const { theme } = useTheme();

  if (theme === "light") {
    return {
      grid:    "#dde5f0",
      tick:    "#6b839e",
      tooltip: { background: "#ffffff", border: "#dde5f0", color: "#0a1628" },
      bar:     "#1e3a8a",
      line:    "#1d4ed8",
      dot:     "#1d4ed8",
    };
  }
  if (theme === "dark1") {
    return {
      grid:    "#1c1c1c",
      tick:    "#4ade80",
      tooltip: { background: "#0d0d0d", border: "#1c1c1c", color: "#dcfce7" },
      bar:     "#22c55e",
      line:    "#22c55e",
      dot:     "#22c55e",
    };
  }
  // dark2
  return {
    grid:    "#101828",
    tick:    "#60a5fa",
    tooltip: { background: "#080c1c", border: "#101828", color: "#dbeafe" },
    bar:     "#3b82f6",
    line:    "#3b82f6",
    dot:     "#3b82f6",
  };
}
