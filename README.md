# Fusion identity implementation (WIP)

Spec: https://github.com/ssb-ngi-pointer/fusion-identity-spec

Methods:
 - [!] Create(cb)
   - init (members) + send key to self
 - [!] Invite(fusionId, peerId, cb)
 - [!] Consent(fusionId, cb)
   - Automatically takes the "first" invite
 - [!] Tombstone(fusionId, reason, cb)

 - [!] Invitations(cb)
   - All non-consented invites
 - [!] Fusions(cb)
 - [!] Tombstoned(cb)
 - [!] Read(fusionId, cb)
 - [!] Redirect(oldFusionId, newFusionId, cb)
 - [!] Redirects
 - [!] Attest(redirectId, reason, cb)
 - [!] Attestations

Automatic (run on post and on startup):
 - [!] Load keys on boot
 - [!] Proof of key
   - trigger: entrust (private)
   - add self to members
 - [!] Entrust
   - trigger: consent
   - send key to consented

-----

Do we even need this now?
 - Fix slowEqual in crut: https://gitlab.com/ahau/lib/ssb-crut/-/merge_requests/13

