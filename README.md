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

To discuss:
 - Update spec to use box2 and group slot for private messages?
 - Update spec to use crut message format?
   - should we add a subtype to make it easier to deduce the step?
 - Multiple entrusts? Delay, who sends first?
 - Triggered needs state, general for crut?
 - Authenticated redirects? Maybe as extension?
   https://ssb-ngi-pointer.github.io/Audit%20Report_%20Secure%20Scuttlebutt%20Partial%20Replication%20and%20Fusion%20Identity.html#Suggestion-A-Explore-Protocol-Extension-for-Authentication-for-Redirects
 - db2 box2?
   - should this be any?
     https://github.com/ssb-ngi-pointer/ssb-db2/blob/da776b23ae888a280b9cb30dc4e4262b55de052a/db.js#L319

-----

Do we even need this now?
 - Fix slowEqual in crut: https://gitlab.com/ahau/lib/ssb-crut/-/merge_requests/13

