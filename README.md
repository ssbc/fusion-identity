# Fusion identity

Fusion identities are a way to specify how multiple devices relates in
such a way that they represent a new combined (fusion) identity. This
code is an implementation of the [fusion identity spec].

Requires the [ssb-db2] and [ssb-db2-box2] modules to be used on the
ssb server.

## Methods

### init(ssb)

Initializes the fusion identity code, meaning:
 - existing keys are loaded into db2
 - newly consented feeds are automatically entrusted the key
 - posts a proof-of-key when entrusted a key for a fusion identity

Returns an objects with the following methods:

### create(cb)

Create a new fusion identity and entrust yourself with the private key.

### invite(fusion, feedId, cb)

Invite a `feedId` to be part of a fusion identity. `fusion` is an
object with `rootId` property.

### consent(fusion, cb)

Consent to joining a fusion identity. `fusion` is an
object with `rootId` property.

### tombstone(fusion, reason, cb)

Tombstone a fusion identity so that it can no longer be used.
`fusion` is an object with `rootId` property. `reason` is an optional
text description for the tombstoning.

### read(fusion, cb)

Gets the current state of the fusion identity (members, invited, if tombstoned)

### invitations(cb)

Returns a list of all fusion identities where you have been invited
but not yet consented.


### all(cb)

Returns a list of all non-tombstoned fusion identities 

### tombstoned(cb)

Returns a list of all tombstoned fusion identities 

Automatic (run on post and on startup):
 - [!] Load keys on boot
 - [!] Proof of key
   - trigger: entrust (private)
   - add self to members
 - [!] Entrust
   - trigger: consent
   - send key to consented

[fusion identity spec]: https://github.com/ssb-ngi-pointer/fusion-identity-spec
[ssb-db2]: https://github.com/ssb-ngi-pointer/ssb-db2
[ssb-db2-box2]: https://github.com/ssb-ngi-pointer/ssb-db2-box2
