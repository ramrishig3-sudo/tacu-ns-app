import axios from "axios";
import { CorrelatedRisk, PortScanResult } from "../types";

export class CorrelationService {
  static async correlateThreats(
    host: string,
    externalThreats: any,
    localScan: PortScanResult[],
    ipInfo: any
  ): Promise<CorrelatedRisk> {
    try {
      const response = await axios.post("/api/threat/correlate", {
        host,
        externalThreats,
        localScan,
        ipInfo
      });
      
      // Store in localStorage for AI Assistant access
      localStorage.setItem("last_correlated_risk", JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error("Correlation failed", error);
      throw error;
    }
  }

  static getLastCorrelatedRisk(): CorrelatedRisk | null {
    const saved = localStorage.getItem("last_correlated_risk");
    return saved ? JSON.parse(saved) : null;
  }
}
