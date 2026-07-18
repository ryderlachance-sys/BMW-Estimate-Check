export interface RepairGuide {
  slug: string;
  title: string;
  metaDescription: string;
  heading: string;
  intro: string;
  shopCostRange: { low: number; high: number };
  partsCostRange: { low: number; high: number };
  laborHours: string;
  symptoms: string[];
  relatedCategories: string[];
  body: { heading: string; text: string }[];
}

export const repairGuides: RepairGuide[] = [
  {
    slug: "bmw-328i-control-arm-replacement-cost",
    title: "BMW 328i Control Arm Replacement Cost (2026 Guide)",
    metaDescription:
      "How much does BMW 328i control arm replacement cost? Shops quote $600–$1,200. See real OEM part prices ($110–$290 per arm) and how to save hundreds.",
    heading: "BMW 328i Control Arm Replacement Cost",
    intro:
      "Worn control arm bushings are one of the most common F30 328i repairs. Shops typically quote $600–$1,200 for a front pair — but the parts themselves cost far less than most invoices suggest.",
    shopCostRange: { low: 600, high: 1200 },
    partsCostRange: { low: 220, high: 580 },
    laborHours: "1.5–2.5 hours",
    symptoms: [
      "Clunking over bumps at low speed",
      "Vague or wandering steering feel",
      "Uneven inner tire wear",
      "Vibration in the steering wheel under braking",
    ],
    relatedCategories: ["Control Arms", "Suspension"],
    body: [
      {
        heading: "Why F30 control arms fail",
        text: "The F30 3 Series uses aluminum lower control arms with hydraulic bushings. The bushings are the wear item — after 60,000–90,000 miles the fluid-filled bushing tears and the arm must be replaced as an assembly.",
      },
      {
        heading: "What the parts actually cost",
        text: "A Lemförder front lower control arm (the same company that supplies BMW's assembly line) runs around $110–$150 per side. Genuine BMW-boxed arms cost more, but you're often paying for the roundel on the box. Dealers commonly bill $350–$500 per arm before labor.",
      },
      {
        heading: "How to save",
        text: "Upload your estimate and we'll match every line to OEM-quality parts. Buy the arms from us, have your shop install them, and you keep the difference — typically $300–$600 on this job.",
      },
    ],
  },
  {
    slug: "bmw-335i-water-pump-replacement-cost",
    title: "BMW 335i Water Pump Replacement Cost (N54/N55)",
    metaDescription:
      "BMW 335i electric water pump replacement typically costs $1,000–$1,800 at a shop. The Pierburg OEM pump costs about $420. See how much you can save.",
    heading: "BMW 335i Water Pump Replacement Cost",
    intro:
      "The N54 and N55 engines in the 335i use an electric water pump that commonly fails between 60,000 and 100,000 miles. Shops quote $1,000–$1,800 for this job, and the part is the biggest line item.",
    shopCostRange: { low: 1000, high: 1800 },
    partsCostRange: { low: 450, high: 650 },
    laborHours: "2.5–4 hours",
    symptoms: [
      "Coolant overheating warning on the iDrive",
      "Drivetrain malfunction / limp mode",
      "Fan running loudly after shutdown",
      "Fault codes 2E81–2E85 (electric coolant pump)",
    ],
    relatedCategories: ["Cooling"],
    body: [
      {
        heading: "Always replace the thermostat too",
        text: "The electric thermostat sits directly next to the pump and requires the same labor to access. Replacing both at once costs almost nothing extra in labor and prevents doing the job twice.",
      },
      {
        heading: "OEM vs. dealer pricing",
        text: "Pierburg manufactures the pump BMW sells in its own box. The Pierburg-branded pump costs roughly $420; the identical genuine-BMW-boxed unit is often quoted at $700–$900 on invoices.",
      },
      {
        heading: "How to save",
        text: "Buy the Pierburg pump and Genuine BMW thermostat through us, then pay your shop for the 2.5–4 hours of labor. Owners typically save $400–$700 versus the all-in shop quote.",
      },
    ],
  },
  {
    slug: "bmw-x5-suspension-repair-cost",
    title: "BMW X5 Suspension Repair Cost (G05 & E70/F15)",
    metaDescription:
      "BMW X5 suspension repairs range from $400 sway bar links to $2,500+ air suspension jobs. See real part prices and cut your quote by 30–50%.",
    heading: "BMW X5 Suspension Repair Cost",
    intro:
      "X5 suspension quotes vary wildly — from a few hundred dollars for end links to thousands for air suspension components. Understanding the parts pricing is the key to not overpaying.",
    shopCostRange: { low: 400, high: 2800 },
    partsCostRange: { low: 80, high: 1400 },
    laborHours: "1–5 hours depending on component",
    symptoms: [
      "Clunks or rattles over rough pavement",
      "Vehicle sits lower on one corner overnight (air suspension)",
      "Floaty or bouncy ride quality",
      "Compressor running constantly",
    ],
    relatedCategories: ["Suspension", "Control Arms"],
    body: [
      {
        heading: "The usual suspects",
        text: "Sway bar end links ($40–$80 each), control arms ($120–$350 each), and shocks/struts ($130–$400 each) cover most X5 suspension complaints. On air-suspension X5s, the compressor (~$650) and air springs are the big-ticket items.",
      },
      {
        heading: "Watch the markup",
        text: "Suspension jobs frequently carry 80–150% parts markup on shop invoices because the MSRP anchor is high. This is exactly where comparing line items pays off the most.",
      },
      {
        heading: "How to save",
        text: "Upload your X5 estimate. We'll match each component to Bilstein, Sachs, Lemförder, or Genuine BMW equivalents and show you the real cost — typically 30–50% below quoted parts pricing.",
      },
    ],
  },
  {
    slug: "bmw-n54-valve-cover-gasket-cost",
    title: "BMW N54 Valve Cover Gasket Replacement Cost",
    metaDescription:
      "N54 valve cover gasket replacement costs $400–$900 at a shop, but the Elring gasket itself is about $35. See where the money goes and how to save.",
    heading: "BMW N54 Valve Cover Gasket Cost",
    intro:
      "An oil-weeping valve cover is practically a rite of passage for N54-powered BMWs (335i, 135i, 535i). The gasket itself is cheap — this job is almost entirely labor, which makes shop quotes easy to inflate.",
    shopCostRange: { low: 400, high: 900 },
    partsCostRange: { low: 35, high: 120 },
    laborHours: "2–3.5 hours",
    symptoms: [
      "Burning oil smell after highway driving",
      "Oil dripping onto the exhaust manifold",
      "Visible oil around the valve cover edges",
      "Slow oil loss with no puddles under the car",
    ],
    relatedCategories: ["Gaskets & Seals"],
    body: [
      {
        heading: "Gasket vs. valve cover",
        text: "If your cover itself is cracked (common on the N54's plastic cover), you'll need the full cover with an integrated gasket. If it's just seeping, the Elring gasket set (~$35) is all you need in parts.",
      },
      {
        heading: "Why quotes vary so much",
        text: "Book time for the N54 is 2–3.5 hours because the cowl, ignition coils, and wiring harness must come off. Some shops quote parts at 3–4x cost to pad a job that is fundamentally labor-driven.",
      },
      {
        heading: "How to save",
        text: "Buy the Elring gasket and fresh Genuine BMW valve cover bolts from us, supply them to your mechanic, and pay only fair labor. Typical savings: $100–$250 on parts alone.",
      },
    ],
  },
];

export function getRepairGuide(slug: string): RepairGuide | undefined {
  return repairGuides.find((g) => g.slug === slug);
}
