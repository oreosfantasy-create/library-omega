import { useTheme } from "@/contexts/ThemeContext";

const LIGHT_LOGO_URL = "/manus-storage/library-omega-light-clean_b0439118.png";
const DARK_LOGO_URL = "/manus-storage/library-omega-dark-clean_1c827907.png";
const sizeClasses = {
  sm: "h-10 w-10 rounded-xl",
  md: "h-12 w-12 rounded-2xl",
  lg: "h-32 w-32 rounded-[2rem]",
} as const;
export type BrandMarkSize = keyof typeof sizeClasses;

export default function BrandMark({ size = "md", label = "Logo Library Omega" }: { size?: BrandMarkSize; label?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <span role="img" aria-label={label} className={`brand-mark brand-mark-${theme} relative inline-flex shrink-0 items-center justify-center overflow-hidden ${sizeClasses[size]}`}>
      <img
        src={isDark ? DARK_LOGO_URL : LIGHT_LOGO_URL}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain invert"
        style={{ filter: "none" }}
      />
      <span className="sr-only text-zinc-950 drop-shadow">Ω</span>
    </span>
  );
}

export { LIGHT_LOGO_URL, DARK_LOGO_URL };
