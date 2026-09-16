import Image from "next/image";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="Smart Tourism"
      width={1224}
      height={1285}
      priority
      className="h-12 w-auto md:h-14"
      style={light ? { filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))" } : undefined}
    />
  );
}
