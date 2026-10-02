# Nyxoshi V11 — Release Notes

V11 is based directly on the complete V10 source tree. Existing V10 files, routes, migrations, dependencies and environment-variable structure are preserved.

## V11 changes

- Angel Girl is now the sole role used for the administrative privileges previously exclusive to Founder #1.
- Founders #1, #2 and #3 remain the three original founders and are treated uniformly; Founder #1 no longer has a special administrative path.
- Added the exclusive `Maluco Cientista de Hardware com Farofa` role, configured by `NYXOSHI_HARDWARE_SCIENTIST_EMAIL`.
- Added the private `🧪 Laboratório da Maluca` panel, isolated from the administrative panel.
- Added persistent laboratory records for ideas, experiments, investigations, solutions, discoveries and general records.
- Laboratory authorization is enforced server-side by the exact `hardware_scientist` role.
- The existing permanent profile ID and email/ID role mechanisms from V10 remain intact.
