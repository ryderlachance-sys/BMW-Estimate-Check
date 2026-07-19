/** Map catalog categories to local product illustration images. */
export function catalogImageForCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("brake")) return "/parts/brakes.svg";
  if (c.includes("cool")) return "/parts/cooling.svg";
  if (c.includes("filter")) return "/parts/filters.svg";
  if (c.includes("gasket") || c.includes("seal")) return "/parts/gaskets.svg";
  if (c.includes("ignition") || c.includes("spark")) return "/parts/ignition.svg";
  if (c.includes("control arm")) return "/parts/control-arms.svg";
  if (c.includes("suspension") || c.includes("mount") || c.includes("bushing"))
    return "/parts/suspension.svg";
  if (c.includes("electric") || c.includes("battery") || c.includes("sensor"))
    return "/parts/electrical.svg";
  if (c.includes("fluid") || c.includes("oil") || c.includes("care")) return "/parts/fluids.svg";
  if (c.includes("engine")) return "/parts/engine.svg";
  return "/parts/general.svg";
}

export function resolveCatalogImageUrl(
  imageUrl: string | null | undefined,
  category: string
): string {
  if (imageUrl && imageUrl.trim()) return imageUrl.trim();
  return catalogImageForCategory(category);
}
