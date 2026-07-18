import Link from "next/link";

const repairLinks = [
  { href: "/repairs/bmw-328i-control-arm-replacement-cost", label: "328i Control Arm Cost" },
  { href: "/repairs/bmw-335i-water-pump-replacement-cost", label: "335i Water Pump Cost" },
  { href: "/repairs/bmw-x5-suspension-repair-cost", label: "X5 Suspension Cost" },
  { href: "/repairs/bmw-n54-valve-cover-gasket-cost", label: "N54 Valve Cover Gasket Cost" },
];

export function Footer() {
  return (
    <footer className="border-t bg-zinc-950 text-zinc-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-bold text-white">
            BMW <span className="text-[#4da3dd]">Estimate Check</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Upload your mechanic&apos;s estimate and instantly see what the parts really
            cost. Built by BMW enthusiasts, for BMW owners.
          </p>
          <p className="mt-6 text-xs text-zinc-500">
            Not affiliated with BMW AG. BMW is a registered trademark of BMW AG.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white">Product</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/upload" className="hover:text-white">Check an Estimate</Link></li>
            <li><Link href="/catalog" className="hover:text-white">Parts Catalog</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white">Common Repairs</p>
          <ul className="mt-4 space-y-2 text-sm">
            {repairLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} BMW Estimate Check. All rights reserved.
      </div>
    </footer>
  );
}
