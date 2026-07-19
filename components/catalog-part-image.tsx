import Image from "next/image";
import { Cog } from "lucide-react";
import { resolveCatalogImageUrl } from "@/lib/catalog-images";

export function CatalogPartImage({
  name,
  category,
  imageUrl,
}: {
  name: string;
  category: string;
  imageUrl?: string | null;
}) {
  const src = resolveCatalogImageUrl(imageUrl, category);
  return (
    <div className="relative h-40 w-full overflow-hidden bg-secondary">
      <Image
        src={src}
        alt={name}
        fill
        unoptimized={src.endsWith(".svg")}
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 25vw"
      />
      {/* Soft fallback if image fails to paint */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <Cog className="size-12 text-muted-foreground/40" />
      </div>
    </div>
  );
}
