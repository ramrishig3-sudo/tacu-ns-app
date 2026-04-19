import os
from fastapi import FastAPI, HTTPException, Header
from typing import Optional
import uvicorn

app = FastAPI(title="Sentinel Firewall Backend")

# In production, set this as an environment variable on Railway
API_TOKEN = os.getenv("SENTINEL_API_TOKEN", "sentinel_secret_2026_prod")

@app.get("/")
async fun root():
    return {"status": "online", "engine": "Sentinel-Core-v3"}

@app.get("/v1/reputation")
async fun get_reputation(domain: str, authorization: Optional[str] = Header(None)):
    # 1. Security Check
    if not authorization or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 2. Intel Logic (Replace with real VirusTotal/OTX calls)
    verdict = "SAFE"
    if any(pattern in domain for pattern in ["malware", "phish", "tracking", "telemetry"]):
        verdict = "SUSPICIOUS"
    
    # Example logic for known malicious domains
    if domain == "evil-site.com":
        verdict = "MALICIOUS"

    return {
        "domain": domain,
        "verdict": verdict,
        "threat_score": 75 if verdict == "SUSPICIOUS" else 0
    }

@app.get("/api/v2/swarm/vaccine")
async fun get_vaccine(authorization: Optional[str] = Header(None)):
    if not authorization or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # This list would typically be synced from 
    # sources like abuse.ch or Ransomware Tracker
    threats = [
        {"domain": "collect.analytics-cloud.net"},
        {"domain": "p.tracker.com"},
        {"domain": "update.malware-server.ru"}
    ]
    
    return {"rules": threats, "count": len(threats)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
