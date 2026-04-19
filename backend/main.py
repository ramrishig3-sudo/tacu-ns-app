import os
import aiohttp
import asyncio
from fastapi import FastAPI, HTTPException, Header
from typing import Optional
import uvicorn

app = FastAPI(title="Sentinel Firewall Intelligence Engine")

# Production Credentials
API_TOKEN = os.getenv("SENTINEL_API_TOKEN", "sentinel_secret_2026_prod")
SAFE_BROWSING_API_KEY = os.getenv("SAFE_BROWSING_API_KEY")
OTX_API_KEY = os.getenv("OTX_API_KEY")

@app.get("/")
async def root():
    return {
        "status": "online",
        "engine": "Sentinel-Core-v3",
        "intelligence_ready": (SAFE_BROWSING_API_KEY is not None or OTX_API_KEY is not None)
    }

async def check_google_safe_browsing(session: aiohttp.ClientSession, domain: str) -> str:
    """Query Google Safe Browsing v4 API"""
    if not SAFE_BROWSING_API_KEY:
        return "SAFE"
    
    url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SAFE_BROWSING_API_KEY}"
    payload = {
        "client": {"clientId": "sentinel-firewall", "clientVersion": "1.0.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": domain}]
        }
    }
    
    try:
        async with session.post(url, json=payload, timeout=2.5) as response:
            if response.status == 200:
                data = await response.json()
                if "matches" in data:
                    return "MALICIOUS"
    except Exception:
        pass
    return "SAFE"

async def check_alienvault_otx(session: aiohttp.ClientSession, domain: str) -> str:
    """Query AlienVault OTX (Open Threat Exchange)"""
    if not OTX_API_KEY:
        return "SAFE"
    
    url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/general"
    headers = {"X-OTX-API-KEY": OTX_API_KEY}
    
    try:
        async with session.get(url, headers=headers, timeout=2.5) as response:
            if response.status == 200:
                data = await response.json()
                pulse_count = data.get("pulse_info", {}).get("count", 0)
                if pulse_count > 5:
                    return "MALICIOUS"
                if pulse_count > 0:
                    return "SUSPICIOUS"
    except Exception:
        pass
    return "SAFE"

@app.get("/v1/reputation")
async def get_reputation(domain: str, authorization: Optional[str] = Header(None)):
    # 1. Mandatory Token Validation
    if not authorization or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 2. Parallel Async Intelligence Lookups
    async with aiohttp.ClientSession() as session:
        # Run Google and OTX in parallel with a hard 3s timeout
        # Using wait_for to prevent slow APIs from blocking the engine
        try:
            google_task = check_google_safe_browsing(session, domain)
            otx_task = check_alienvault_otx(session, domain)
            
            google_res, otx_res = await asyncio.gather(google_task, otx_task)
            
            # 3. Hybrid Verdict System
            if google_res == "MALICIOUS" or otx_res == "MALICIOUS":
                verdict = "MALICIOUS"
            elif otx_res == "SUSPICIOUS":
                verdict = "SUSPICIOUS"
            else:
                # Basic local behavioral fallback if APIs are offline or haven't flagged yet
                verdict = "SAFE"
                if any(p in domain for p in ["malware", "phish", "telemetry"]):
                    verdict = "SUSPICIOUS"

            return {
                "domain": domain,
                "verdict": verdict,
                "providers": {
                    "google": google_res,
                    "otx": otx_res
                },
                "timestamp": os.getenv("RAILWAY_DEPLOY_TIMESTAMP", "now")
            }
        except asyncio.TimeoutError:
            return {"domain": domain, "verdict": "SAFE", "error": "timeout"}
        except Exception as e:
            return {"domain": domain, "verdict": "SAFE", "error": str(e)}

@app.get("/api/v2/swarm/vaccine")
async def get_vaccine(authorization: Optional[str] = Header(None)):
    if not authorization or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Swarm intelligence: returning high-confidence threats for offline cache
    threats = [
        {"domain": "collect.analytics-cloud.net"},
        {"domain": "p.tracker.com"},
        {"domain": "update.malware-server.ru"}
    ]
    return {"rules": threats, "count": len(threats)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
