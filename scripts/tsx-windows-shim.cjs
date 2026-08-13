// tsx asks Windows for the current username only to name a temp directory.
// Some Windows sessions return ENOMEM from that OS call after long uptimes.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 1000;
}
