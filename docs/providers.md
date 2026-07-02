# IP Detection Providers

NeoCheck uses a concurrent, isolated plugin architecture to lookup connection data. Providers do not communicate with each other; instead, they return strongly-typed results to a central aggregator.

## Supported Providers
1. **AbuseIPDB:** Query client IP abuse histories and reports.
2. **BigDataCloud:** Resolves client coordinates and regional ISP maps.
3. **IPQualityScore:** Checks device fingerprints, VPN, and proxy endpoints.
4. **Scamalytics:** Aggregates a fraud risk value.

## Configuration & Testing
- Go to the **IP Providers** section in the Admin Dashboard to input API keys.
- Click **Test Connection** to verify key validity.
- Toggles allow you to enable or disable specific providers instantly.
