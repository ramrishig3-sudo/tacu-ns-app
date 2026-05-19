import { registerPlugin } from "@capacitor/core";

export interface LanDevice {
  ip:  string;
  mac: string;
}

export interface LanScanPlugin {
  scan(options: { subnet: string; timeout: number }): Promise<{ devices: LanDevice[] }>;
}

const LanScan = registerPlugin<LanScanPlugin>("LanScan");
export default LanScan;
