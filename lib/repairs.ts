export interface RepairGuide {
  slug: string;
  make: string;
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
    slug: "toyota-camry-brake-pad-replacement-cost",
    make: "Toyota",
    title: "Toyota Camry Brake Pad Replacement Cost (2026)",
    metaDescription: "Compare typical Toyota Camry brake-pad shop charges, parts prices, labor time, and ways to verify the correct pads before buying.",
    heading: "Toyota Camry Brake Pad Replacement Cost",
    intro: "A one-axle Camry brake-pad job commonly lands around $300–$450 at a repair shop, but model year, axle, pad material, and local labor rates can move the total substantially.",
    shopCostRange: { low: 300, high: 450 },
    partsCostRange: { low: 45, high: 195 },
    laborHours: "1–2 hours per axle",
    symptoms: ["Brake wear indicator or warning", "Squealing while braking", "Longer stopping distance", "Pads measuring near their service limit"],
    relatedCategories: ["Brakes"],
    body: [
      { heading: "Pads are axle-specific", text: "Front and rear pads are different, and some Camry generations use more than one brake package. Confirm the year, trim, axle, and VIN before ordering." },
      { heading: "Compare the parts line", text: "Ask whether the quote includes pads only, hardware, rotor resurfacing, or new rotors. Upload the written estimate so Engine Genie can compare the parts charge without mixing in labor." },
    ],
  },
  {
    slug: "honda-civic-alternator-replacement-cost",
    make: "Honda",
    title: "Honda Civic Alternator Replacement Cost (2026)",
    metaDescription: "Honda Civic alternator replacement cost guide with common symptoms, parts ranges, labor time, and fitment checks.",
    heading: "Honda Civic Alternator Replacement Cost",
    intro: "Civic alternator quotes vary sharply by generation and engine. A broad planning range is $500–$1,200, with new OEM-grade units costing more than remanufactured alternatives.",
    shopCostRange: { low: 500, high: 1200 },
    partsCostRange: { low: 180, high: 700 },
    laborHours: "1.5–3.5 hours",
    symptoms: ["Battery warning light", "Dim or flickering lights", "Repeated dead battery", "Charging-system voltage below specification"],
    relatedCategories: ["Electrical"],
    body: [
      { heading: "Test before replacing", text: "A weak battery, damaged belt, wiring fault, or poor connection can resemble alternator failure. A charging-system test should identify the cause before parts are ordered." },
      { heading: "Match the output and connector", text: "Civic alternators can differ by engine, transmission, amperage, and electrical connector. Use the VIN and OEM number from the estimate whenever possible." },
    ],
  },
  {
    slug: "ford-f150-brake-rotor-replacement-cost",
    make: "Ford",
    title: "Ford F-150 Brake Rotor Replacement Cost (2026)",
    metaDescription: "Estimate Ford F-150 brake rotor and pad costs, understand per-axle labor, and compare compatible parts before purchasing.",
    heading: "Ford F-150 Brake Rotor Replacement Cost",
    intro: "F-150 brake work can range from a basic one-axle rotor job to a four-wheel pad-and-rotor service. A practical one-axle planning range is roughly $450–$900.",
    shopCostRange: { low: 450, high: 900 },
    partsCostRange: { low: 160, high: 500 },
    laborHours: "1.5–3 hours per axle",
    symptoms: ["Steering-wheel shake under braking", "Pedal pulsation", "Deep rotor scoring", "Rotor thickness below specification"],
    relatedCategories: ["Brakes"],
    body: [
      { heading: "Truck configuration matters", text: "Rotor diameter can change with model year, payload package, drivetrain, and axle. Confirm the VIN and the exact front or rear position." },
      { heading: "Compare equal kits", text: "A quote may bundle pads, rotors, hardware, and fluid service. Compare the same number of rotors and the same axle so the savings calculation stays honest." },
    ],
  },
  {
    slug: "jeep-grand-cherokee-alternator-replacement-cost",
    make: "Jeep",
    title: "Jeep Grand Cherokee Alternator Replacement Cost (2026)",
    metaDescription: "Jeep Grand Cherokee alternator replacement cost, common warning signs, and exact engine and amperage fitment considerations.",
    heading: "Jeep Grand Cherokee Alternator Replacement Cost",
    intro: "Grand Cherokee alternator replacement commonly falls around $750–$1,350, but engine, amperage rating, model year, and whether the unit is new or remanufactured make a major difference.",
    shopCostRange: { low: 750, high: 1350 },
    partsCostRange: { low: 300, high: 900 },
    laborHours: "1–2.5 hours",
    symptoms: ["Battery or charging warning", "Slow cranking after driving", "Electrical accessories cutting out", "Measured charging voltage outside specification"],
    relatedCategories: ["Electrical"],
    body: [
      { heading: "Do not match by model name alone", text: "The Grand Cherokee has used several engines and alternator outputs. A listing for the right year can still be wrong for the engine or electrical package." },
      { heading: "Use the OEM number", text: "The safest comparison uses the VIN or the OEM number printed on the estimate or original alternator. Confirm the connector and amperage on the retailer page." },
    ],
  },
  {
    slug: "chevrolet-silverado-wheel-bearing-replacement-cost",
    make: "Chevrolet",
    title: "Chevrolet Silverado Wheel Bearing Replacement Cost (2026)",
    metaDescription: "Chevrolet Silverado wheel hub and bearing replacement cost, symptoms, labor range, and 2WD/4WD fitment checks.",
    heading: "Chevrolet Silverado Wheel Bearing Replacement Cost",
    intro: "A Silverado wheel hub or bearing replacement often costs $450–$900 per wheel. Heavy-duty models, four-wheel drive, corrosion, and sensor-equipped hub assemblies can raise the price.",
    shopCostRange: { low: 450, high: 900 },
    partsCostRange: { low: 120, high: 450 },
    laborHours: "1.5–3 hours per wheel",
    symptoms: ["Humming that changes with speed", "Wheel play", "ABS or traction-control warning", "Grinding from one corner"],
    relatedCategories: ["Wheel Hubs", "Suspension"],
    body: [
      { heading: "Hub assemblies vary", text: "Silverado 1500, 2500 HD, and 3500 HD hubs are not interchangeable. Drivetrain, axle rating, wheel studs, and ABS connector all matter." },
      { heading: "Confirm the failed corner", text: "Noise can travel through a truck chassis. The technician should identify the affected wheel before you compare a left, right, front, or rear part." },
    ],
  },
  {
    slug: "nissan-rogue-control-arm-replacement-cost",
    make: "Nissan",
    title: "Nissan Rogue Control Arm Replacement Cost (2026)",
    metaDescription: "Nissan Rogue control arm replacement cost guide with bushing symptoms, alignment considerations, and parts-price comparisons.",
    heading: "Nissan Rogue Control Arm Replacement Cost",
    intro: "Replacing one Rogue control arm commonly costs about $450–$900. Quotes for both sides, tie-rod work, or an alignment can run higher.",
    shopCostRange: { low: 450, high: 900 },
    partsCostRange: { low: 100, high: 350 },
    laborHours: "1.5–3 hours per side",
    symptoms: ["Clunking over bumps", "Cracked or separated bushings", "Steering wander", "Uneven tire wear"],
    relatedCategories: ["Control Arms", "Suspension"],
    body: [
      { heading: "The assembly may include bushings", text: "Many shops replace the full arm rather than pressing one bushing. Check whether the quoted part includes the ball joint and all bushings." },
      { heading: "Plan for alignment", text: "Suspension work can change alignment. Keep alignment and labor separate from the parts comparison so an inexpensive control arm is not presented as the full repair cost." },
    ],
  },
  {
    slug: "subaru-outback-cv-axle-replacement-cost",
    make: "Subaru",
    title: "Subaru Outback CV Axle Replacement Cost (2026)",
    metaDescription: "Subaru Outback CV axle replacement cost, torn-boot symptoms, OEM versus aftermarket considerations, and labor estimates.",
    heading: "Subaru Outback CV Axle Replacement Cost",
    intro: "A Subaru Outback CV axle replacement commonly runs $450–$900 per axle. OEM axles can cost considerably more than aftermarket assemblies.",
    shopCostRange: { low: 450, high: 900 },
    partsCostRange: { low: 150, high: 500 },
    laborHours: "1.5–3 hours per axle",
    symptoms: ["Clicking while turning", "Grease around a torn CV boot", "Vibration during acceleration", "Clunk when shifting between drive and reverse"],
    relatedCategories: ["Drivetrain"],
    body: [
      { heading: "A torn boot is not always a failed axle", text: "If caught early, a damaged boot may be serviceable before the joint wears. Clicking, vibration, or contamination often leads to full axle replacement." },
      { heading: "Quality matters", text: "Low-cost axles can introduce vibration or fitment problems. Compare the OEM number, transmission, engine, and axle position—not only the vehicle name." },
    ],
  },
  {
    slug: "lexus-rx350-water-pump-replacement-cost",
    make: "Lexus",
    title: "Lexus RX 350 Water Pump Replacement Cost (2026)",
    metaDescription: "Lexus RX 350 water pump replacement cost by generation, parts-price range, labor considerations, and fitment checks.",
    heading: "Lexus RX 350 Water Pump Replacement Cost",
    intro: "RX 350 water-pump replacement varies dramatically by model year and engine layout. A broad planning range is $700–$2,000, with some generations requiring extensive access labor.",
    shopCostRange: { low: 700, high: 2000 },
    partsCostRange: { low: 180, high: 500 },
    laborHours: "3–11 hours depending on generation",
    symptoms: ["Coolant leak or pink residue", "Bearing rattle", "Overheating", "Coolant odor after driving"],
    relatedCategories: ["Cooling"],
    body: [
      { heading: "Generation changes the job", text: "A 2015 RX 350 and a 2020 RX 350 can have very different access requirements and labor time. Never use one generic RX price without checking the year and engine." },
      { heading: "Related parts may be justified", text: "A shop may recommend coolant, a belt, thermostat, or seals while access overlaps. Compare each part line individually and ask why it is included." },
    ],
  },
  {
    slug: "bmw-328i-control-arm-replacement-cost",
    make: "BMW",
    title: "BMW 328i Control Arm Replacement Cost (2026)",
    metaDescription: "BMW 328i control arm replacement cost, common symptoms, parts ranges, and alignment considerations.",
    heading: "BMW 328i Control Arm Replacement Cost",
    intro: "A front control-arm repair on a BMW 328i commonly ranges from $600–$1,200 for a pair, depending on generation, arm position, brand, and labor rate.",
    shopCostRange: { low: 600, high: 1200 },
    partsCostRange: { low: 220, high: 580 },
    laborHours: "1.5–3 hours",
    symptoms: ["Clunking over bumps", "Steering wander", "Uneven tire wear", "Vibration under braking"],
    relatedCategories: ["Control Arms", "Suspension"],
    body: [
      { heading: "Identify the exact arm", text: "BMW front suspensions use multiple links that are casually called control arms. The estimate should identify left/right and tension strut versus wishbone." },
      { heading: "Compare OE suppliers", text: "Brands such as Lemförder may supply OE-equivalent parts, but the OEM number and vehicle build must still match. Ask whether an alignment is included." },
    ],
  },
  {
    slug: "bmw-335i-water-pump-replacement-cost",
    make: "BMW",
    title: "BMW 335i Water Pump Replacement Cost (N54/N55)",
    metaDescription: "BMW 335i electric water pump replacement cost, thermostat considerations, parts range, and labor estimate.",
    heading: "BMW 335i Water Pump Replacement Cost",
    intro: "The electric water pump on many N54- and N55-powered 335i models can put the full repair around $1,000–$1,800.",
    shopCostRange: { low: 1000, high: 1800 },
    partsCostRange: { low: 450, high: 700 },
    laborHours: "2.5–4.5 hours",
    symptoms: ["Overheating warning", "Reduced-power mode", "Cooling fan running loudly", "Electric coolant-pump fault codes"],
    relatedCategories: ["Cooling"],
    body: [
      { heading: "Thermostat overlap", text: "The thermostat is close to the pump on many applications, so a shop may recommend both. Confirm the diagnosis and compare each part line separately." },
      { heading: "Verify the engine", text: "N54 and N55 applications overlap but are not universally identical. Use the VIN, engine, and OEM number before ordering a pump kit." },
    ],
  },
  {
    slug: "bmw-x5-suspension-repair-cost",
    make: "BMW",
    title: "BMW X5 Suspension Repair Cost Guide",
    metaDescription: "BMW X5 suspension repair costs for links, control arms, struts, and air-suspension components.",
    heading: "BMW X5 Suspension Repair Cost",
    intro: "X5 suspension costs range from a few hundred dollars for links to several thousand for air-suspension or multi-arm work.",
    shopCostRange: { low: 400, high: 2800 },
    partsCostRange: { low: 80, high: 1400 },
    laborHours: "1–6 hours depending on component",
    symptoms: ["Clunks over rough pavement", "One corner sitting low", "Bouncy ride", "Air compressor running excessively"],
    relatedCategories: ["Suspension", "Control Arms"],
    body: [
      { heading: "Name the failed component", text: "End links, control arms, struts, air springs, and compressors have very different costs. A useful estimate must identify the exact corner and component." },
      { heading: "Match the suspension option", text: "Standard, adaptive, and air-suspension X5 configurations use different parts. Confirm options by VIN before comparing listings." },
    ],
  },
  {
    slug: "bmw-n54-valve-cover-gasket-cost",
    make: "BMW",
    title: "BMW N54 Valve Cover Gasket Replacement Cost",
    metaDescription: "BMW N54 valve cover gasket and complete valve cover replacement cost, symptoms, parts range, and labor time.",
    heading: "BMW N54 Valve Cover Gasket Cost",
    intro: "An N54 valve-cover-gasket repair commonly costs $500–$1,100. A cracked plastic cover requires a complete cover and raises the parts total.",
    shopCostRange: { low: 500, high: 1100 },
    partsCostRange: { low: 40, high: 550 },
    laborHours: "2.5–4.5 hours",
    symptoms: ["Burning oil smell", "Oil near the exhaust side", "Oil around ignition coils", "Visible seepage at the cover edge"],
    relatedCategories: ["Gaskets & Seals"],
    body: [
      { heading: "Gasket or complete cover", text: "A leaking gasket and a warped or cracked cover are different repairs. Ask the shop to identify which condition it found before buying parts." },
      { heading: "Keep labor separate", text: "Access requires removing covers, coils, and harness sections. Compare the gasket or cover price separately from legitimate labor time." },
    ],
  },
];

export function getRepairGuide(slug: string): RepairGuide | undefined {
  return repairGuides.find((guide) => guide.slug === slug);
}
