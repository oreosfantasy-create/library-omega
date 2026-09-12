/**
 * Identidad visual oficial de Library Omega: gatito + símbolo Ω.
 * Se mantiene el asset del gato y se superpone el Ω para que la marca sea
 * reconocible tanto en la cabecera como en el lector y la mascota.
 */
const CAT_IMAGE_URL = "/library-omega-cat.png";
const sizeClasses = {
  sm: "h-9 w-9 rounded-xl text-base",
  md: "h-11 w-11 rounded-2xl text-xl",
  lg: "h-28 w-28 rounded-[2rem] text-5xl",
} as const;
export type BrandMarkSize = keyof typeof sizeClasses;
export default function BrandMark({ size = "md", label = "Logo Library Omega" }: { size?: BrandMarkSize; label?: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-zinc-950 shadow-xl ${sizeClasses[size]}`}
    >
      <img
        src={CAT_IMAGE_URL}
        alt=""
        aria-hidden="true"
        className="absolute inset-[10%] h-[80%] w-[80%] object-contain opacity-95 invert"
      />
      <span className="relative z-10 font-display font-black leading-none text-zinc-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]">Ω</span>
    </span>
  );
}
export { CAT_IMAGE_URL };
