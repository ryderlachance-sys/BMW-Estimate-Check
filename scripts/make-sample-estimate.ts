/**
 * Builds a sample Lexus shop estimate PNG you can upload to test the site.
 * Run: npx tsx scripts/make-sample-estimate.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "samples");
const outPng = path.join(outDir, "lexus-rx350-test-estimate.png");
const outTxt = path.join(outDir, "lexus-rx350-test-estimate.txt");

const plainText = `SUMMIT AUTO CARE
1840 Oakridge Pkwy — Austin, TX 78741
(512) 555-0142

REPAIR ESTIMATE
Date: August 11, 2026
Estimate #: EST-48291

Vehicle: 2019 Lexus RX 350
Engine: 3.5L V6
VIN: JTJBARBZ5K2123456
Mileage: 78,420

Customer complaint: Front brakes squealing, battery light intermittent.

----------------------------------------------------------------
Parts
----------------------------------------------------------------
Front brake pads                          1    $189.00
Brake rotors pair                         1    $320.00
Alternator                                1    $450.00

----------------------------------------------------------------
Labor
----------------------------------------------------------------
R&R front pads and rotors               1.5 hr @ $165   $247.50
Alternator replacement                  1.2 hr @ $165   $198.00

----------------------------------------------------------------
Subtotal parts                                            $959.00
Subtotal labor                                            $445.50
Shop supplies                                              $18.50
Tax                                                        $88.38
----------------------------------------------------------------
TOTAL ESTIMATE                                          $1,511.38

Estimate valid for 30 days.
`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
  <rect width="900" height="1100" fill="#f5f5f5"/>
  <rect x="40" y="40" width="820" height="1020" fill="#ffffff" stroke="#222" stroke-width="2"/>
  <text x="70" y="95" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111">SUMMIT AUTO CARE</text>
  <text x="70" y="122" font-family="Arial, sans-serif" font-size="13" fill="#555">1840 Oakridge Pkwy — Austin, TX 78741 · (512) 555-0142</text>
  <line x1="70" y1="140" x2="830" y2="140" stroke="#1a6fb5" stroke-width="3"/>
  <text x="70" y="180" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111">REPAIR ESTIMATE</text>
  <text x="70" y="208" font-family="Arial, sans-serif" font-size="14" fill="#333">Date: August 11, 2026 · Estimate #: EST-48291</text>
  <rect x="70" y="230" width="760" height="88" fill="#eef6fc" stroke="#b8d4ea"/>
  <text x="90" y="265" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#111">Vehicle: 2019 Lexus RX 350</text>
  <text x="90" y="292" font-family="Arial, sans-serif" font-size="13" fill="#333">Engine: 3.5L V6 · Mileage: 78,420</text>
  <text x="70" y="355" font-family="Arial, sans-serif" font-size="13" fill="#444">Customer complaint: Front brakes squealing, battery light intermittent.</text>
  <text x="70" y="400" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#111">PARTS</text>
  <text x="70" y="435" font-family="Consolas, monospace" font-size="14" fill="#222">Front brake pads                              1     $189.00</text>
  <text x="70" y="465" font-family="Consolas, monospace" font-size="14" fill="#222">Brake rotors pair                             1     $320.00</text>
  <text x="70" y="495" font-family="Consolas, monospace" font-size="14" fill="#222">Alternator                                    1     $450.00</text>
  <text x="70" y="545" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#111">LABOR</text>
  <text x="70" y="580" font-family="Consolas, monospace" font-size="14" fill="#222">R&amp;R front pads and rotors           1.5 hr @ $165   $247.50</text>
  <text x="70" y="610" font-family="Consolas, monospace" font-size="14" fill="#222">Alternator replacement              1.2 hr @ $165   $198.00</text>
  <line x1="70" y1="650" x2="830" y2="650" stroke="#ccc" stroke-width="1"/>
  <text x="70" y="685" font-family="Consolas, monospace" font-size="14" fill="#222">Subtotal parts                                         $959.00</text>
  <text x="70" y="715" font-family="Consolas, monospace" font-size="14" fill="#222">Subtotal labor                                         $445.50</text>
  <text x="70" y="745" font-family="Consolas, monospace" font-size="14" fill="#222">Shop supplies                                           $18.50</text>
  <text x="70" y="775" font-family="Consolas, monospace" font-size="14" fill="#222">Tax                                                     $88.38</text>
  <text x="70" y="820" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#111">TOTAL ESTIMATE                                       $1,511.38</text>
  <text x="70" y="870" font-family="Arial, sans-serif" font-size="12" fill="#666">Estimate valid for 30 days.</text>
</svg>`;

async function main() {
  await mkdir(outDir, { recursive: true });
  await writeFile(outTxt, plainText);
  await sharp(Buffer.from(svg)).png().toFile(outPng);
  console.log("Wrote", outPng);
  console.log("Wrote", outTxt);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
