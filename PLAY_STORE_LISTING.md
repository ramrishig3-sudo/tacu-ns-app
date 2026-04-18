# Play Store Listing Draft

## Short Description
Local VPN firewall with app rules, DNS filtering, threat checks, and on-device security logs.

## Full Description
TacU_NS FW Zero Trust Security is a local-only Android firewall designed for privacy-first mobile protection.

Features in v1:
- Start and stop a local VPN firewall
- Create allow/block rules for installed apps
- Add manual DNS allow/block rules
- Query TacU NS reputation service backed by Google Safe Browsing and OTX
- View local firewall logs on device
- Review clear privacy and VPN usage disclosures

Important disclosures:
- This app uses Android VpnService to manage local network traffic handling.
- Traffic rules and logs remain on device by default. Queried domains may be sent to TacU NS services for reputation checks.
- This app is inspired by enterprise firewall workflows, but it is not affiliated with Palo Alto Networks and does not claim full enterprise deep packet inspection.

## Data Safety Draft
- Data collected: None
- Data shared: None
- App functionality: local firewall rules, DNS filtering, on-device logging
