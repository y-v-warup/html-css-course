// Clearly-labelled demo products. These are sample datasets, NOT scans of a
// real package — the UI always marks them as demo data.

export interface DemoSample {
  id: string;
  name: string;
  hint: string;
}

export const DEMO_SAMPLES: DemoSample[] = [
  { id: "biscuits", name: "Packaged Biscuits", hint: "Food · front + back label" },
  { id: "rice", name: "Packaged Rice", hint: "Food · grain pack · QR present" },
  { id: "snack", name: "Packaged Snack", hint: "Food · single pack · no QR" },
];
