export type EbayCompatibilityInput = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  engine?: string | null;
};

export function ebayCompatibilityProperties(input: EbayCompatibilityInput) {
  return [
    input.year ? { name: "Year", value: String(input.year) } : null,
    input.make ? { name: "Make", value: input.make } : null,
    input.model ? { name: "Model", value: input.model } : null,
    input.trim ? { name: "Trim", value: input.trim } : null,
    input.engine ? { name: "Engine", value: input.engine } : null,
  ].filter((entry): entry is { name: string; value: string } => Boolean(entry));
}

export function hasCompleteEbayCompatibility(input: EbayCompatibilityInput): boolean {
  return Boolean(input.year && input.make && input.model && input.trim && input.engine);
}

export function buildEbayCompatibilityFilter(input: EbayCompatibilityInput): string {
  return ebayCompatibilityProperties(input)
    .map(({ name, value }) => `${name}:${value.replace(/[;|]/g, " ")}`)
    .join(";");
}
