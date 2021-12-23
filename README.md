# Fusion identity implementation (WIP)

Spec: https://github.com/ssb-ngi-pointer/fusion-identity-spec

Operations:
 - init [!] - crut members
 - invite [!] - crut invited
 - consent [!] - crut consented (self)
 - tombstone [!] - built into CRU(T)

Stateful:
 - entrust (private message) []
   - need state for this, only first should send
   - needs crut members operation on reception
 - proof of key (optional) []

Need modelling:
 - redirect []
 - attestation []

Do we even need this now?
 - Fix slowEqual in crut: https://gitlab.com/ahau/lib/ssb-crut/-/merge_requests/13

