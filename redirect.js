const Crut = require('ssb-crut')
const redirectSpec = require('./specs/redirect')
const attestSpec = require('./specs/attestation')

const { where, and, slowEqual, type, toCallback } = require('ssb-db2/operators')

function notTombstoned(list) {
  return list.filter(x => !x.states.some(s => s.tombstone))
}

module.exports = {
  init(ssb) {
    const redirectCrut = new Crut(ssb, redirectSpec)
    const attestCrut = new Crut(ssb, attestSpec)

    return {
      redirect: {
        create(oldFusionId, newFusionId, cb) {
          redirectCrut.create({ old: oldFusionId, new: newFusionId }, cb)
        },

        tombstone(redirectId, reason, cb) {
          redirectCrut.tombstone(redirectId, { reason }, cb)
        },

        all(cb) {
          ssb.db.query(
            where(
              and(
                // FIXME: remove this once we have proper types
                slowEqual('value.content.tangles.redirect.root', null),
                type('fusion/redirect')
              )
            ),
            // FIXME: return a stream
            toCallback((err, roots) => {
              if (err) return cb(err)

              Promise.all(roots.map(root => redirectCrut.read(root.key)))
                .then(redirects => cb(null, notTombstoned(redirects)))
            })
          )
        },
      },

      attest: {
        create(redirectId, position, description, cb) {
          attestCrut.create({ target: redirectId, position, description }, cb)
        },

        update(attestationId, position, description, cb) {
          attestCrut.update(attestationId, { position, description }, cb)
        },

        read(attestationId, cb) {
          attestCrut.read(attestationId, cb)
        },

        tombstone(attestationId, description, cb) {
          attestCrut.tombstone(attestationId, { description }, cb)
        },

        all(redirectId, cb) {
          ssb.db.query(
            where(
              and(
                slowEqual('value.content.target', redirectId),
                // FIXME: remove this once we have proper types
                slowEqual('value.content.tangles.attestation.root', null),
                type('fusion/attestation')
              )
            ),
            // FIXME: return a stream
            toCallback((err, roots) => {
              if (err) return cb(err)

              Promise.all(roots.map(root => attestCrut.read(root.key)))
                .then(attestations => cb(null, notTombstoned(attestations)))
            })
          )
        }
      }
    }
  }
}
