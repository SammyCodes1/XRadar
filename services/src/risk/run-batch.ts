import { runRiskChecks } from "./runRiskChecks";
import type { XLayerNetwork } from "@xradar/shared";

const jobs: { token: string; chain: XLayerNetwork; label: string }[] = [
  {
    label: "WOKB (verified wrapper)",
    token: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    chain: "mainnet",
  },
  {
    label: "USDT-like WOKB pair token",
    token: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
    chain: "mainnet",
  },
  {
    label: "ScanProbeToken (testnet, no LP)",
    token: "0xe1B9d1f2DdE0Ea33C90c5a99E1d330274809D034",
    chain: "testnet",
  },
];

for (const job of jobs) {
  console.log(`\n===== ${job.label} ${job.token} (${job.chain}) =====`);
  try {
    const findings = await runRiskChecks(job.token, job.chain);
    console.log(JSON.stringify(findings, null, 2));
  } catch (error) {
    console.error(error);
  }
}
