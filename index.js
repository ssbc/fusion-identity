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
    recps: [keys.id, recipient]
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

    ssb.box2.setReady()
    ssb.box2.registerIsGroup(recp => recp.startsWith('ssb:identity/fusion/'))

    const crut = new Crut(ssb, fusionSpec)

    return {
      create(cb) {
        const keys = getFusionKey()
        const data = { id: keys.id, members: { add: [ssb.id] } }
        crut.create(data, (err, rootId) => {
          if (err) return cb(err)

          const { /*type, format, */ data } = SSBURI.decompose(keys.id)

          // FIXME: Buffer.from is not correct!
          ssb.box2.addGroupKey(keys.id, Buffer.from(keys.private))

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

      all(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          cb(null, identities.filter(x => !x.states.some(y => y.tombstone)))
        })
      },

      tombstoned(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          cb(null, identities.filter(x => x.states.some(y => y.tombstone)))
        })
      }
    }
  }
}
