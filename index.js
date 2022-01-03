const Crut = require('ssb-crut')
const fusionSpec = require('./specs/fusion')
const SSBURI = require('ssb-uri2')
const ssbKeys = require('ssb-keys')

const { where, and, slowEqual, type, toCallback } = require('ssb-db2/operators')

function getFusionKey() {
  const keys = ssbKeys.generate()

  const classicUri = SSBURI.fromFeedSigil(keys.id)
  const { /*type, format, */ data } = SSBURI.decompose(classicUri)
  const fusionUri = SSBURI.compose({
    type: 'identity', format: 'fusion', data
  })
  keys.id = fusionUri

  return keys
}

function entrust(ssb, rootId, keys, recipient, cb) {
  ssb.db.publish({
    type: 'fusion/entrust',
    secretKey: keys.private, // FIXME: also not correct here
    fusionRoot: rootId,
    recps: [keys.id, recipient] // fusionId in first slot
  }, cb)
}

function allFusions(ssb, crut, cb) {
  ssb.db.query(
    where(
      and(
        slowEqual('value.content.tangles.fusion.root', null),
        type('fusion')
      )
    ), toCallback((err, identityRoots) => {
      if (err) return cb(err)
      Promise.all(identityRoots.map((root) => {
        return crut.read(root.key)
      })).then((identities) => { cb(null, identities) })
    })
  )
}

module.exports = {
  init(ssb) {
    if (!ssb.box2) throw new Error('fusion identity needs ssb-db2-box2')
    if (!ssb.box2.hasOwnDMKey()) throw new Error('fusion identity needs own box2 DM key')

    ssb.box2.setReady()

    ssb.db.query(
      where(
        type('fusion/entrust')
      ), toCallback((err, msgs) => {
        msgs.forEach(msg => {
          const { recps, secretKey } = msg.value.content
          // FIXME: validate keys (recps[0] must match secretKey)
          ssb.box2.addGroupKey(recps[0], Buffer.from(secretKey, 'hex'))
        })

        ssb.box2.registerIsGroup(recp => recp.startsWith('ssb:identity/fusion/'))
      })
    )

    const crut = new Crut(ssb, fusionSpec)

    // FIXME: automatic stuff (proof-of-key, entrust)

    return {
      create(cb) {
        const keys = getFusionKey()
        const data = { id: keys.id, members: { add: [ssb.id] } }
        crut.create(data, (err, rootId) => {
          if (err) return cb(err)

          const { /*type, format, */ data } = SSBURI.decompose(keys.id)

          // FIXME: Buffer.from is not correct!
          ssb.box2.addGroupKey(keys.id, Buffer.from(keys.private, 'hex'))

          entrust(ssb, rootId, keys, ssb.id, (err) => {
            if (err) return cb(err)
            else return cb(null, {
              keys,
              rootId
            })
          })
        })
      },

      invite(fusion, peerId, cb) {
        crut.update(fusion.rootId, { invited: { add: [peerId] } }, cb)
      },

      consent(fusion, cb) {
        crut.update(fusion.rootId, { consented: { add: [ssb.id] } }, cb)
      },

      read(fusion, cb) {
        crut.read(fusion.rootId, cb)
      },

      tombstone(fusion, reason, cb) {
        crut.tombstone(fusion.rootId, { reason }, cb)
      },

      // all fusions

      invitations(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          const invited = identities.filter(x => x.states.some(s => s.invited.includes(ssb.id)))
          const consented = identities.filter(x => x.states.some(s => s.consented.includes(ssb.id)))

          cb(null, invited.filter(x => !consented.includes(x)))
        })
      },

      all(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          cb(null, identities.filter(x => !x.states.some(s => s.tombstone)))
        })
      },

      tombstoned(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          cb(null, identities.filter(x => x.states.some(s => s.tombstone)))
        })
      }
    }
  }
}
