import { PrismaClient, StockStatus } from "@prisma/client";
import { catalogImageForCategory } from "../lib/catalog-images";

const db = new PrismaClient();

const F30 = ["328i", "335i", "340i", "M3"];
const F30_YEARS = [2012, 2013, 2014, 2015, 2016, 2017, 2018];
const G20_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const G05_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const F90_M5_YEARS = [2018, 2019, 2020, 2021, 2022, 2023];
const G90_M5_YEARS = [2024, 2025, 2026];
const N54_CARS = ["335i", "135i", "535i"];
const N54_YEARS = [2007, 2008, 2009, 2010, 2011, 2012, 2013];

interface SeedPart {
  sku: string;
  brand: string;
  name: string;
  description: string;
  category: string;
  oemNumbers: string[];
  compatibleModels: string[];
  compatibleYears: number[];
  price: number;
  imageUrl?: string;
  stockStatus?: StockStatus;
}

const parts: SeedPart[] = [
  // ---------- Control arms ----------
  {
    sku: "LEM-31126852991",
    brand: "Lemförder",
    name: "Front Lower Control Arm — Left",
    description:
      "OE-supplier aluminum front lower control arm with hydraulic bushing for F30 3 Series. Lemförder supplies BMW's production line.",
    category: "Control Arms",
    oemNumbers: ["31126852991"],
    compatibleModels: ["328i", "335i"],
    compatibleYears: F30_YEARS,
    price: 124.99,
  },
  {
    sku: "LEM-31126852992",
    brand: "Lemförder",
    name: "Front Lower Control Arm — Right",
    description:
      "OE-supplier aluminum front lower control arm with hydraulic bushing for F30 3 Series, right side.",
    category: "Control Arms",
    oemNumbers: ["31126852992"],
    compatibleModels: ["328i", "335i"],
    compatibleYears: F30_YEARS,
    price: 124.99,
  },
  {
    sku: "BMW-31106888855",
    brand: "Genuine BMW",
    name: "Front Control Arm — Left (G20)",
    description:
      "Genuine BMW front lower wishbone for the G20 3 Series including M340i. Includes pre-installed bushing.",
    category: "Control Arms",
    oemNumbers: ["31106888855"],
    compatibleModels: ["330i", "340i", "M340i"],
    compatibleYears: G20_YEARS,
    price: 289.99,
  },
  {
    sku: "BMW-31122284975",
    brand: "Genuine BMW",
    name: "M3/M4 Front Control Arm with Ball Joint",
    description:
      "Genuine BMW M front tension strut for F80 M3 and F82 M4. Motorsport-derived forged aluminum construction.",
    category: "Control Arms",
    oemNumbers: ["31122284975"],
    compatibleModels: ["M3", "M4"],
    compatibleYears: [2014, 2015, 2016, 2017, 2018],
    price: 349.99,
  },
  {
    sku: "LEM-31126855742",
    brand: "Lemförder",
    name: "Front Tension Strut — Right (X5)",
    description:
      "OE-supplier front tension strut with bushing for E70/F15/G05 X5. Direct replacement, no coding required.",
    category: "Control Arms",
    oemNumbers: ["31126863786"],
    compatibleModels: ["X5"],
    compatibleYears: [2014, 2015, 2016, 2017, 2018, ...G05_YEARS],
    price: 156.99,
  },

  // ---------- Cooling ----------
  {
    sku: "PIE-11517632426",
    brand: "Pierburg",
    name: "Electric Water Pump (N54/N55)",
    description:
      "The exact electric coolant pump BMW installs at the factory, in a Pierburg box. Fits N54 and N55 turbo engines. Fault codes 2E81–2E85.",
    category: "Cooling",
    oemNumbers: ["11517632426", "11517588885"],
    compatibleModels: [...N54_CARS, "X5", "135i", "435i"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016],
    price: 419.99,
  },
  {
    sku: "BMW-11537549476",
    brand: "Genuine BMW",
    name: "Electric Coolant Thermostat (N54/N55)",
    description:
      "Genuine BMW electronically-controlled thermostat. Always replace with the electric water pump — shares the same labor.",
    category: "Cooling",
    oemNumbers: ["11537549476"],
    compatibleModels: [...N54_CARS, "X5", "135i", "435i"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016],
    price: 189.99,
  },
  {
    sku: "REI-11518482251",
    brand: "Rein",
    name: "Coolant Pump (B58)",
    description:
      "Mechanical coolant pump for B58-powered 340i, M340i, and X5 40i. OE-quality composite impeller.",
    category: "Cooling",
    oemNumbers: ["11518482251"],
    compatibleModels: ["340i", "M340i", "X5", "540i"],
    compatibleYears: [2016, 2017, 2018, ...G20_YEARS],
    price: 349.99,
  },
  {
    sku: "BMW-17127531579",
    brand: "Genuine BMW",
    name: "Radiator Hose — Upper",
    description: "Genuine BMW upper radiator hose with quick-connect fittings for N52/N54/N55 3 Series.",
    category: "Cooling",
    oemNumbers: ["17127531579"],
    compatibleModels: ["328i", "335i", "135i"],
    compatibleYears: [...N54_YEARS, 2014, 2015],
    price: 47.99,
  },
  {
    sku: "BMW-11427589156",
    brand: "Genuine BMW",
    name: "Oil Filter Housing Gasket (B46/B48)",
    description:
      "Genuine BMW oil filter housing gasket for B46/B48 engines in 430i, 330i, and 230i. Common oil leak repair.",
    category: "Gaskets & Seals",
    oemNumbers: ["11427589156", "11428613157"],
    compatibleModels: ["430i", "330i", "230i", "530i", "X3", "X4"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 18.99,
  },
  {
    sku: "BMW-11428637840",
    brand: "Genuine BMW",
    name: "Oil Filter Housing (B46/B48)",
    description:
      "Genuine BMW oil filter housing assembly for B46/B48. Often replaced when the housing cracks or the gasket leaks repeatedly.",
    category: "Engine",
    oemNumbers: ["11428637840", "11428511253"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 189.99,
  },
  {
    sku: "PIE-11518658955",
    brand: "Pierburg",
    name: "Water Pump with Pulley (B46/B48)",
    description:
      "OE-supplier water pump with pulley for B46/B48 engines. Fits 430i / 330i / 230i.",
    category: "Cooling",
    oemNumbers: ["11518658955", "11518617169"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 149.99,
  },
  {
    sku: "BMW-11538647941",
    brand: "Genuine BMW",
    name: "Turbo Coolant Line",
    description:
      "Genuine BMW turbocharger coolant line for B46/B48 turbo engines. Sold individually — cars often need two.",
    category: "Cooling",
    oemNumbers: ["11538647941", "11538647942"],
    compatibleModels: ["430i", "330i", "230i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 42.99,
  },
  {
    sku: "BMW-11537589122",
    brand: "Genuine BMW",
    name: "Coolant Pipe O-Ring",
    description: "Genuine BMW coolant pipe O-ring / seal for B46/B48 cooling circuit repairs.",
    category: "Cooling",
    oemNumbers: ["11537589122", "07119906362"],
    compatibleModels: ["430i", "330i", "230i", "340i", "530i"],
    compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
    price: 6.99,
  },

  // ---------- Gaskets & Seals ----------
  {
    sku: "ELR-11127565286",
    brand: "Elring",
    name: "Valve Cover Gasket Set (N54)",
    description:
      "Complete Elring valve cover gasket set for the N54 twin-turbo inline six. Includes spark plug well seals.",
    category: "Gaskets & Seals",
    oemNumbers: ["11127565286"],
    compatibleModels: N54_CARS,
    compatibleYears: N54_YEARS,
    price: 34.99,
  },
  {
    sku: "VR-11127582245",
    brand: "Victor Reinz",
    name: "Valve Cover Gasket Set (N52)",
    description:
      "OE-quality valve cover gasket set for the N52 inline six found in 328i and X5 30i models.",
    category: "Gaskets & Seals",
    oemNumbers: ["11127582245"],
    compatibleModels: ["328i", "X5", "528i"],
    compatibleYears: [2007, 2008, 2009, 2010, 2011, 2012, 2013],
    price: 29.99,
  },
  {
    sku: "BMW-11128676519",
    brand: "Genuine BMW",
    name: "Valve Cover with Integrated Gasket (B58)",
    description:
      "Genuine BMW complete valve cover assembly for B58 engines. Required when the plastic cover itself cracks or warps.",
    category: "Gaskets & Seals",
    oemNumbers: ["11128676519"],
    compatibleModels: ["340i", "M340i", "X5", "540i"],
    compatibleYears: [2016, 2017, 2018, ...G20_YEARS],
    price: 389.99,
    stockStatus: "LOW_STOCK",
  },
  {
    sku: "BMW-11428637821",
    brand: "Genuine BMW",
    name: "Oil Filter Housing Gasket Kit (N52/N54/N55)",
    description:
      "Genuine BMW oil filter housing gasket — the most common oil leak on the N-series inline sixes. Kit includes both gaskets.",
    category: "Gaskets & Seals",
    oemNumbers: ["11428637821", "11427537293"],
    compatibleModels: ["328i", "335i", "135i", "535i", "X5"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016],
    price: 18.99,
  },

  // ---------- Ignition ----------
  {
    sku: "BOS-12137594937",
    brand: "Bosch",
    name: "Ignition Coil (N54/N55)",
    description:
      "Bosch OE ignition coil for N54/N55 turbo engines. Cures single-cylinder misfire codes 30D1–30D6. Sold individually.",
    category: "Ignition",
    oemNumbers: ["12137594937", "12138616153"],
    compatibleModels: [...N54_CARS, "X5", "135i", "435i", "M3"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016, 2017, 2018],
    price: 49.99,
  },
  {
    sku: "DEL-12138657273",
    brand: "Delphi",
    name: "Ignition Coil (B46/B48/B58)",
    description:
      "Delphi OE ignition coil for the modular B-series engines used in G20 3 Series and G05 X5. Sold individually.",
    category: "Ignition",
    oemNumbers: ["12138657273"],
    compatibleModels: ["330i", "340i", "M340i", "X5", "230i"],
    compatibleYears: G20_YEARS,
    price: 42.99,
  },
  {
    sku: "NGK-12120037607",
    brand: "NGK",
    name: "Laser Platinum Spark Plug (N54/N55)",
    description:
      "NGK 97968 laser platinum plug, the OE specification for N54/N55. Replace every 40–60k miles on tuned cars. Sold individually.",
    category: "Ignition",
    oemNumbers: ["12120037607"],
    compatibleModels: [...N54_CARS, "X5", "135i"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016],
    price: 11.99,
  },
  {
    sku: "NGK-12120040551",
    brand: "NGK",
    name: "Spark Plug (B58)",
    description: "NGK OE-spec spark plug for B58 engines in the 340i, M340i, and X5 40i. Sold individually.",
    category: "Ignition",
    oemNumbers: ["12120040551"],
    compatibleModels: ["340i", "M340i", "X5", "540i"],
    compatibleYears: [2016, 2017, 2018, ...G20_YEARS],
    price: 14.99,
  },

  // ---------- Brakes ----------
  {
    sku: "BRE-34116792223",
    brand: "Brembo",
    name: "Front Brake Rotor Pair (F30, 340mm)",
    description:
      "Brembo OE-replacement coated front rotors for F30 3 Series with M Sport brakes. Sold as a pair, 340mm.",
    category: "Brakes",
    oemNumbers: ["34116792223"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 189.99,
  },
  {
    sku: "BMW-34106859181",
    brand: "Genuine BMW",
    name: "Front Brake Pad Set (F30)",
    description:
      "Genuine BMW front brake pads for F30/F32 with standard or M Sport calipers. Includes wear sensor provision.",
    category: "Brakes",
    oemNumbers: ["34106859181"],
    compatibleModels: ["328i", "335i", "340i", "428i", "435i"],
    compatibleYears: F30_YEARS,
    price: 129.99,
  },
  {
    sku: "AKE-EUR1609A",
    brand: "Akebono",
    name: "Euro Ultra-Premium Front Brake Pads (F30)",
    description:
      "Akebono ceramic front pads — dramatically less brake dust than OE with equivalent stopping power.",
    category: "Brakes",
    oemNumbers: ["34106859181"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 89.99,
  },
  {
    sku: "ZIM-34216792227",
    brand: "Zimmermann",
    name: "Rear Brake Rotor Pair (F30)",
    description: "Zimmermann coated rear rotors for F30 3 Series, sold as a pair. Made in Germany.",
    category: "Brakes",
    oemNumbers: ["34216792227"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 149.99,
  },
  {
    sku: "BRE-34118089937",
    brand: "Brembo",
    name: "M3/M4 Front Rotor — Right (380mm)",
    description: "Brembo OE replacement 380mm front rotor for F80 M3 / F82 M4 with iron brakes.",
    category: "Brakes",
    oemNumbers: ["34118089937"],
    compatibleModels: ["M3", "M4"],
    compatibleYears: [2014, 2015, 2016, 2017, 2018],
    price: 259.99,
    stockStatus: "SPECIAL_ORDER",
  },

  // ---------- Suspension ----------
  {
    sku: "BIL-31316873765",
    brand: "Bilstein",
    name: "B4 Front Strut — Left (F30)",
    description:
      "Bilstein B4 OE-replacement front strut for F30 3 Series without adaptive dampers (non-EDC).",
    category: "Suspension",
    oemNumbers: ["31316873765"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 219.99,
  },
  {
    sku: "SAC-33526873764",
    brand: "Sachs",
    name: "Rear Shock Absorber (F30)",
    description: "Sachs OE rear damper for F30 3 Series. Restores factory ride quality. Sold individually.",
    category: "Suspension",
    oemNumbers: ["33526873764"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 129.99,
  },
  {
    sku: "MEY-31306792211",
    brand: "Meyle",
    name: "HD Front Sway Bar End Link",
    description:
      "Meyle heavy-duty front stabilizer end link with reinforced ball studs and 4-year warranty. Sold individually.",
    category: "Suspension",
    oemNumbers: ["31306792211"],
    compatibleModels: ["328i", "335i", "340i", "X5"],
    compatibleYears: [...F30_YEARS, ...G05_YEARS],
    price: 39.99,
  },
  {
    sku: "BMW-37206886059",
    brand: "Genuine BMW",
    name: "Air Suspension Compressor (G05 X5)",
    description:
      "Genuine BMW air supply unit for G05 X5 with 2-axle air suspension. Includes relay and mounting hardware.",
    category: "Suspension",
    oemNumbers: ["37206886059"],
    compatibleModels: ["X5", "X7"],
    compatibleYears: G05_YEARS,
    price: 649.99,
    stockStatus: "LOW_STOCK",
  },

  // ---------- Engine ----------
  {
    sku: "BMW-11287571015",
    brand: "Genuine BMW",
    name: "Belt Tensioner (N54/N52)",
    description: "Genuine BMW mechanical belt tensioner. Replace with the serpentine belt to stop cold-start squeal.",
    category: "Engine",
    oemNumbers: ["11287571015"],
    compatibleModels: ["328i", "335i", "135i", "528i"],
    compatibleYears: N54_YEARS,
    price: 129.99,
  },
  {
    sku: "CON-11288600333",
    brand: "Continental",
    name: "Serpentine Belt (N54/N55)",
    description: "Continental OE-quality 6-rib serpentine drive belt for N54/N55 engines.",
    category: "Engine",
    oemNumbers: ["11288600333", "11287628652"],
    compatibleModels: [...N54_CARS, "X5", "135i"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016],
    price: 29.99,
  },
  {
    sku: "COR-22116855456",
    brand: "Corteco",
    name: "Engine Mount — Right (F30)",
    description:
      "Corteco OE hydraulic engine mount for F30 3 Series. Cures excessive idle vibration in the cabin.",
    category: "Engine",
    oemNumbers: ["22116855456"],
    compatibleModels: ["328i", "335i", "340i"],
    compatibleYears: F30_YEARS,
    price: 94.99,
  },

  // ---------- Filters ----------
  {
    sku: "MAH-11427826799",
    brand: "Mahle",
    name: "Oil Filter Kit (B46/B48/B58)",
    description:
      "Mahle OX 813/2D oil filter with drain plug washer — the filter BMW's own boxes contain, for B-series engines.",
    category: "Filters",
    oemNumbers: ["11427826799"],
    compatibleModels: ["330i", "340i", "M340i", "X5", "230i", "540i"],
    compatibleYears: [2016, 2017, 2018, ...G20_YEARS],
    price: 12.99,
  },
  {
    sku: "MAH-11427566327",
    brand: "Mahle",
    name: "Oil Filter Kit (N52/N54/N55)",
    description: "Mahle OX 254D oil filter kit with seals for N-series inline six engines.",
    category: "Filters",
    oemNumbers: ["11427566327"],
    compatibleModels: ["328i", "335i", "135i", "535i", "X5", "M3"],
    compatibleYears: [...N54_YEARS, 2014, 2015, 2016, 2017, 2018],
    price: 11.99,
  },

  // ---------- F90 M5 (S63) ----------
  {
    sku: "BMW-34116860017",
    brand: "Genuine BMW",
    name: "Front Brake Pad Set (F90 M5)",
    description:
      "Genuine BMW front brake pad set for F90 M5 / M5 Competition with iron brakes. Includes wear sensors.",
    category: "Brakes",
    oemNumbers: ["34116860017", "34116855152"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 289.99,
  },
  {
    sku: "BMW-34216860018",
    brand: "Genuine BMW",
    name: "Rear Brake Pad Set (F90 M5)",
    description: "Genuine BMW rear brake pad set for F90 M5 iron brakes.",
    category: "Brakes",
    oemNumbers: ["34216860018", "34216855158"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 219.99,
  },
  {
    sku: "BRE-34116855156",
    brand: "Brembo",
    name: "Front Brake Rotor Pair (F90 M5)",
    description:
      "Brembo OE-spec front rotors for F90 M5. Sold as a pair. Confirm iron vs carbon-ceramic before ordering.",
    category: "Brakes",
    oemNumbers: ["34116855156", "34116855155"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 459.99,
  },
  {
    sku: "BRE-34216855160",
    brand: "Brembo",
    name: "Rear Brake Rotor Pair (F90 M5)",
    description: "Brembo OE-spec rear rotors for F90 M5. Sold as a pair.",
    category: "Brakes",
    oemNumbers: ["34216855160", "34216855159"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 389.99,
  },
  {
    sku: "NGK-12120040570",
    brand: "NGK",
    name: "Spark Plug (S63 M5/M8)",
    description:
      "NGK OE-spec spark plug for the S63 twin-turbo V8 in F90 M5 and F92 M8. Sold individually — M5 needs 8.",
    category: "Ignition",
    oemNumbers: ["12120040570", "12120040569"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: [...F90_M5_YEARS, 2024],
    price: 18.99,
  },
  {
    sku: "BOS-0221504470",
    brand: "Bosch",
    name: "Ignition Coil (S63)",
    description: "Bosch OE ignition coil for S63 V8. Sold individually — M5 needs 8.",
    category: "Ignition",
    oemNumbers: ["12138647474", "12138616153"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: F90_M5_YEARS,
    price: 64.99,
  },
  {
    sku: "ELR-11127570292",
    brand: "Elring",
    name: "Valve Cover Gasket Set (S63)",
    description:
      "Elring valve cover gasket set for S63 engines in F90 M5. Includes spark plug tube seals where applicable.",
    category: "Gaskets & Seals",
    oemNumbers: ["11127570292", "11128637801"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: F90_M5_YEARS,
    price: 129.99,
  },
  {
    sku: "BMW-11427512300",
    brand: "Genuine BMW",
    name: "Oil Filter Housing Gasket Set (S63)",
    description:
      "Genuine BMW oil filter housing gasket set for S63 V8. Common leak repair on F90 M5.",
    category: "Gaskets & Seals",
    oemNumbers: ["11427512300", "11428637799"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: F90_M5_YEARS,
    price: 42.99,
  },
  {
    sku: "MAH-OX388D",
    brand: "Mahle",
    name: "Oil Filter (S63 M5)",
    description: "Mahle oil filter for S63 twin-turbo V8 — F90 M5 / M8.",
    category: "Filters",
    oemNumbers: ["11428637727", "11427508969"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: F90_M5_YEARS,
    price: 16.99,
  },
  {
    sku: "MAN-C27019",
    brand: "Mann-Filter",
    name: "Engine Air Filter (F90 M5)",
    description: "Mann engine air filter for F90 M5.",
    category: "Filters",
    oemNumbers: ["13718585325"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 34.99,
  },
  {
    sku: "MAN-CUK2939",
    brand: "Mann-Filter",
    name: "Cabin Air Filter (F90/G30)",
    description: "Mann cabin filter with activated carbon for F90 M5 and G30 5 Series.",
    category: "Filters",
    oemNumbers: ["64319313519"],
    compatibleModels: ["M5", "530i", "540i"],
    compatibleYears: [...F90_M5_YEARS, 2017],
    price: 24.99,
  },
  {
    sku: "BMW-11287586955",
    brand: "Genuine BMW",
    name: "Serpentine Belt (S63)",
    description: "Genuine BMW drive belt for S63 accessory drive.",
    category: "Engine",
    oemNumbers: ["11287586955"],
    compatibleModels: ["M5", "M8"],
    compatibleYears: F90_M5_YEARS,
    price: 48.99,
  },
  {
    sku: "LEM-22116855655",
    brand: "Lemförder",
    name: "Front Engine Mount (F90 M5)",
    description: "Lemförder hydraulic engine mount for F90 M5 — left/right shared design on many builds.",
    category: "Suspension",
    oemNumbers: ["22116855655", "22116855656"],
    compatibleModels: ["M5"],
    compatibleYears: F90_M5_YEARS,
    price: 189.99,
  },
  {
    sku: "BMW-83192460569",
    brand: "Genuine BMW",
    name: "Engine Oil — TwinPower Turbo 0W-30 (1L)",
    description: "Genuine BMW LL-01 FE 0W-30. M5 oil changes typically need ~10 liters.",
    category: "Fluids & Care",
    oemNumbers: ["83192460569"],
    compatibleModels: ["M5", "M8", "M3", "M4"],
    compatibleYears: [...F90_M5_YEARS, ...G90_M5_YEARS, 2021, 2022, 2023],
    price: 18.99,
  },

  // ---------- G90 M5 (S68) — 2024+ ----------
  {
    sku: "BMW-34115A3B595",
    brand: "Genuine BMW",
    name: "Front Brake Pad Set (G90 M5)",
    description:
      "Genuine BMW front brake pads for G90/G99 M5 (iron brakes). Confirm carbon-ceramic option before ordering.",
    category: "Brakes",
    oemNumbers: ["34115A3B595", "34116899801"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 319.99,
  },
  {
    sku: "BMW-34215A3B597",
    brand: "Genuine BMW",
    name: "Rear Brake Pad Set (G90 M5)",
    description: "Genuine BMW rear brake pads for G90 M5 iron brakes.",
    category: "Brakes",
    oemNumbers: ["34215A3B597"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 249.99,
  },
  {
    sku: "BRE-34116899810",
    brand: "Brembo",
    name: "Front Brake Rotor Pair (G90 M5)",
    description: "Brembo front rotors for G90 M5. Sold as a pair.",
    category: "Brakes",
    oemNumbers: ["34116899810", "34115A3B600"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 529.99,
  },
  {
    sku: "BRE-34216899812",
    brand: "Brembo",
    name: "Rear Brake Rotor Pair (G90 M5)",
    description: "Brembo rear rotors for G90 M5. Sold as a pair.",
    category: "Brakes",
    oemNumbers: ["34216899812"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 449.99,
  },
  {
    sku: "NGK-12120040580",
    brand: "NGK",
    name: "Spark Plug (S68 M5)",
    description:
      "NGK OE-spec spark plug for the S68 twin-turbo V8 in G90 M5. Sold individually — needs 8.",
    category: "Ignition",
    oemNumbers: ["12120040580", "12125A1B123"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 22.99,
  },
  {
    sku: "BOS-0221504800",
    brand: "Bosch",
    name: "Ignition Coil (S68)",
    description: "Bosch ignition coil for S68 V8. Sold individually — M5 needs 8.",
    category: "Ignition",
    oemNumbers: ["12138689100"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 72.99,
  },
  {
    sku: "MAH-OX416D",
    brand: "Mahle",
    name: "Oil Filter (S68 G90 M5)",
    description: "Mahle oil filter for S68 — G90/G99 M5.",
    category: "Filters",
    oemNumbers: ["11428689120", "11425A0B456"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 19.99,
  },
  {
    sku: "MAN-C30140",
    brand: "Mann-Filter",
    name: "Engine Air Filter (G90 M5)",
    description: "Mann engine air filter for G90 M5.",
    category: "Filters",
    oemNumbers: ["13715A2B200"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 39.99,
  },
  {
    sku: "MAN-CUK31003",
    brand: "Mann-Filter",
    name: "Cabin Air Filter (G90 M5 / G60)",
    description: "Mann cabin filter for G90 M5 and related G60 platform cars.",
    category: "Filters",
    oemNumbers: ["64315A1B300"],
    compatibleModels: ["M5", "530i", "540i"],
    compatibleYears: G90_M5_YEARS,
    price: 29.99,
  },
  {
    sku: "BMW-11425A0B500",
    brand: "Genuine BMW",
    name: "Oil Filter Housing Gasket (S68)",
    description: "Genuine BMW oil filter housing gasket for S68 engines.",
    category: "Gaskets & Seals",
    oemNumbers: ["11425A0B500"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 28.99,
  },
  {
    sku: "ELR-11125A1B700",
    brand: "Elring",
    name: "Valve Cover Gasket Set (S68)",
    description: "Elring valve cover gasket set for S68 V8 in G90 M5.",
    category: "Gaskets & Seals",
    oemNumbers: ["11125A1B700"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 149.99,
  },
  {
    sku: "BMW-11285A2B800",
    brand: "Genuine BMW",
    name: "Serpentine Belt (S68)",
    description: "Genuine BMW accessory drive belt for S68.",
    category: "Engine",
    oemNumbers: ["11285A2B800"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 54.99,
  },
  {
    sku: "BMW-11537589180",
    brand: "Genuine BMW",
    name: "Thermostat (S68)",
    description: "Genuine BMW thermostat assembly for S68 cooling circuit.",
    category: "Cooling",
    oemNumbers: ["11537589180", "11535A1B900"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 129.99,
  },
  {
    sku: "PIE-11518690000",
    brand: "Pierburg",
    name: "Electric Water Pump (S68)",
    description: "Pierburg electric water pump for S68 — G90 M5.",
    category: "Cooling",
    oemNumbers: ["11518690000"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 489.99,
  },
  {
    sku: "BMW-61615A3B100",
    brand: "Genuine BMW",
    name: "Wiper Blade Set (G90 M5)",
    description: "Genuine BMW front wiper blade set for G90 M5.",
    category: "Fluids & Care",
    oemNumbers: ["61615A3B100"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 64.99,
  },
  {
    sku: "VAR-595390",
    brand: "Varta",
    name: "AGM Battery (G90 M5)",
    description: "Varta AGM battery sized for G90 M5 electrical load. Coding may be required after install.",
    category: "Electrical",
    oemNumbers: ["61215A0B200"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 329.99,
  },
  {
    sku: "BMW-34356891200",
    brand: "Genuine BMW",
    name: "Brake Wear Sensor — Front (G90)",
    description: "Genuine BMW front brake pad wear sensor for G90 M5.",
    category: "Brakes",
    oemNumbers: ["34356891200"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 34.99,
  },
  {
    sku: "BMW-83192211191",
    brand: "Genuine BMW",
    name: "Brake Fluid — DOT 4 (1L)",
    description: "Genuine BMW DOT 4 brake fluid. Bleed volume typically 1–2 liters.",
    category: "Fluids & Care",
    oemNumbers: ["83192211191"],
    compatibleModels: ["M5", "M3", "M4", "M8", "330i", "340i", "430i"],
    compatibleYears: [...F90_M5_YEARS, ...G90_M5_YEARS, ...G20_YEARS],
    price: 16.99,
  },
  {
    sku: "BMW-82110145399",
    brand: "Genuine BMW",
    name: "Antifreeze — Blue (1L concentrate)",
    description: "Genuine BMW coolant concentrate. Mix 50/50 with distilled water.",
    category: "Fluids & Care",
    oemNumbers: ["82110145399"],
    compatibleModels: ["M5", "M3", "M4", "330i", "340i", "430i", "X5"],
    compatibleYears: [...F90_M5_YEARS, ...G90_M5_YEARS, ...G20_YEARS, ...G05_YEARS],
    price: 19.99,
  },
  {
    sku: "LEM-33326891200",
    brand: "Lemförder",
    name: "Front Control Arm — Lower (G90 M5)",
    description: "Lemförder front lower control arm for G90 M5 chassis.",
    category: "Control Arms",
    oemNumbers: ["33326891200"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 249.99,
  },
  {
    sku: "SAC-31537601200",
    brand: "Sachs",
    name: "Front Shock Absorber (G90 M5)",
    description: "Sachs OE-spec front damper for G90 M5. Sold individually.",
    category: "Suspension",
    oemNumbers: ["31537601200"],
    compatibleModels: ["M5"],
    compatibleYears: G90_M5_YEARS,
    price: 389.99,
  },
];

const demoVehicles = [
  { year: 2014, model: "328i", trim: "xDrive", engine: "N20", vin: "WBA3B5C50EF598742" },
  { year: 2013, model: "335i", trim: "M Sport", engine: "N55", vin: "WBA3A9C58DF476631" },
  { year: 2021, model: "340i", trim: "M340i xDrive", engine: "B58", vin: "WBA5U9C08M9E12345" },
  { year: 2016, model: "M3", trim: "Competition", engine: "S55", vin: "WBS8M9C55G5D30217" },
  { year: 2022, model: "X5", trim: "xDrive40i", engine: "B58", vin: "5UXCR6C05N9F54321" },
];

async function main() {
  console.log("Seeding catalog parts…");
  for (const part of parts) {
    const payload = {
      ...part,
      stockStatus: part.stockStatus ?? ("IN_STOCK" as StockStatus),
      imageUrl: part.imageUrl ?? catalogImageForCategory(part.category),
    };
    await db.catalogPart.upsert({
      where: { sku: part.sku },
      update: payload,
      create: payload,
    });
  }
  console.log(`  ${parts.length} parts upserted.`);

  console.log("Seeding demo user + vehicles…");
  const demoUser = await db.user.upsert({
    where: { email: "demo@bmwestimatecheck.com" },
    update: { isAdmin: true },
    create: {
      clerkId: "local-owner",
      email: "demo@bmwestimatecheck.com",
      name: "Demo Driver",
      isAdmin: true,
    },
  });

  for (const v of demoVehicles) {
    const exists = await db.vehicle.findFirst({
      where: { userId: demoUser.id, vin: v.vin },
    });
    if (!exists) {
      await db.vehicle.create({ data: { ...v, make: "BMW", userId: demoUser.id } });
    }
  }
  console.log(`  ${demoVehicles.length} demo vehicles ensured.`);

  console.log("Seeding favorite mechanic…");
  const existingShop = await db.mechanic.findFirst({
    where: { userId: demoUser.id, shopName: "Precision Motorwerks LLC" },
  });
  if (!existingShop) {
    await db.mechanic.create({
      data: {
        userId: demoUser.id,
        shopName: "Precision Motorwerks LLC",
        contactPerson: "Mike D.",
        address: "2280 Commerce Blvd, Unit C",
        city: "Columbus",
        state: "OH",
        zip: "43204",
        phone: "(614) 555-0187",
        notes: "Leave parts with the service advisor.",
        isFavorite: true,
      },
    });
  }
  console.log("  Favorite mechanic ensured.");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
