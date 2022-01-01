# Fusion identity implementation (WIP)

Spec: https://github.com/ssb-ngi-pointer/fusion-identity-spec

Methods:
 - Create(cb)
   - init (members) + send key to self
 - Invite(fusionId, peerId, cb)
 - Consent(fusionId, cb)
   - Automatically takes the "first" invite
 - Tombstone(fusionId, reason, cb)

 - Invitations(cb)
   - All non-consented invites
 - Fusions(cb)
 - Hydrate(fusionId, cb)
 - Redirect(oldFusionId, newFusionId, cb)
 - Attest(redirectId, reason, cb)
 - RemoveAttest(attestId, reason, cb)

Automatic (run on post and on startup):
 - Proof of key
   - trigger: entrust (private)
   - add self to members
 - Entrust
   - trigger: consent
   - send key to consented

Operations:
 - init [!] - crut members
 - invite [!] - crut invited
 - consent [!] - crut consented (self)
 - tombstone [!] - built into CRU(T)
 - proof-of-key [] - crut members

 - redirect [!]
 - attestation [!]

Stateful:
 - entrust (private message) []
   - need state for this
   - should we delay for anyone not the inviter to reduce the number
     of keys sent?
 - proof of key (optional) []
   Note that protocol includes members separate from consented. For
   this reason, members only makes sense if it signifies reception of
   key.

Do we even need this now?
 - Fix slowEqual in crut: https://gitlab.com/ahau/lib/ssb-crut/-/merge_requests/13

