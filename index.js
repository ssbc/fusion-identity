const Crut = require('ssb-crut')
const fusionSpec = require('./specs/fusion')
const SSBURI = require('ssb-uri2')
const ssbKeys = require('ssb-keys')
const ssbKeysU = require('ssb-keys/util')

const { where, and, slowEqual, type, toCallback } = require('ssb-db2/operators')

function getFusionKey() {
  const keys = ssbKeys.generate()

  const classicUri = SSBURI.fromFeedSigil(keys.id)
  const { data } = SSBURI.decompose(classicUri)
  const fusionUri = SSBURI.compose({ type: 'identity', format: 'fusion', data })
  keys.id = fusionUri

  return keys
}

function entrust(ssb, rootId, consentId, fusionId, secretKey, recipient, cb) {
  ssb.db.publish({
    type: 'fusion/entrust',
    secretKey: secretKey.toString('base64'),
    rootId,
    consentId,
    recps: [fusionId, recipient]
  }, cb)
}

// FIXME: return a stream
function allFusions(ssb, crut, cb) {
  ssb.db.query(
    where(
      and(
        // FIXME: remove this once we have proper types
        slowEqual('value.content.tangles.fusion.root', null),
        type('fusion')
      )
    ),
    toCallback((err, identityRoots) => {
      if (err) return cb(err)

      Promise.all(identityRoots.map(root => crut.read(root.key)))
        .then(identities => cb(null, identities))
    })
  )
}

function notTombstoned(list) {
  return list.filter(x => !x.states.some(s => s.tombstone))
}

function tombstoned(list) {
  return list.filter(x => x.states.some(s => s.tombstone))
}

module.exports = {
  init(ssb) {
    if (!ssb.box2) throw new Error('fusion identity needs ssb-db2-box2')
    if (!ssb.box2.hasOwnDMKey()) throw new Error('fusion identity needs own box2 DM key')

    ssb.db.query(
      where(
        type('fusion/entrust')
      ),
      toCallback((err, msgs) => {
        if (err) return

        msgs.forEach(msg => {
          const { recps, secretKey } = msg.value.content
          // FIXME: validate keys (recps[0] must match secretKey)
          ssb.box2.addGroupKey(recps[0], Buffer.from(secretKey, 'base64'))
        })

        ssb.box2.registerIsGroup(recp => recp.startsWith('ssb:identity/fusion/'))
      })
    )

    const crut = new Crut(ssb, fusionSpec)

    function runAutomaticActions(msg) {
      const { type, subtype, consented, tangles } = msg.value.content

      if (type === 'fusion') {
        if (!tangles?.fusion) return
        if (subtype !== 'fusion/consent') return

        // note this can result in multiple entrust but for now that
        // is okay, as the groups are small

        const rootId = tangles.fusion.root

        if (consented && Object.keys(consented).length > 0) {
          crut.read(rootId, (err, fusionData) => {
            const isMember = fusionData.states.some(s => s.members.includes(ssb.id))
            if (isMember) {
              // get keys
              const secretKey = ssb.box2.getGroupKey(fusionData.id)
              entrust(ssb, rootId, msg.key, fusionData.id, secretKey, msg.value.author, (err) => {
                if (err) console.error('failed to entrust', err)

                // FIXME: use debug() here
              })
            }
          })
        }
      } else if (type === 'fusion/entrust') {
        if (msg.value.author === ssb.id) return // skip self created

        const { recps, secretKey, rootId, consentId } = msg.value.content
        const privateKey = Buffer.from(secretKey, 'base64')
        ssb.box2.addGroupKey(recps[0], privateKey)

        crut.read(rootId, (err, fusionData) => {
          const isInvited = fusionData.states.some(s => s.invited.includes(ssb.id))
          const isMember = fusionData.states.some(s => s.members.includes(ssb.id))

          if (isInvited && !isMember) {
            const proofStr = consentId + 'fusion/proof-of-key'
            const privateKeyStr = secretKey + ".ed25519"
            const data = {
              subtype: 'fusion/proof-of-key',
              members: { add: [ssb.id] },
              consentId,
              proofOfKey: ssbKeys.sign(privateKeyStr, proofStr)
            }
            crut.update(rootId, data, (err) => {
              if (err) console.error('failed to write proof-of-key', err)

              // FIXME: use debug() here
            })
          }
        })
      }
    }

    // automatic actions based on messages
    ssb.db.post(msg => {
      if (typeof msg.value.content === 'string') {
        // try to decrypt, FIXME: this is a bit silly
        ssb.db.get(msg.key, (err, msgValue) => {
          if (err) return
          runAutomaticActions({ key: msg.key, value: msgValue })
        })
      } else
        runAutomaticActions(msg)
    })

    return {
      create(cb) {
        const keys = getFusionKey()
        const data = {
          subtype: 'fusion/init',
          id: keys.id,
          members: { add: [ssb.id] }
        }
        crut.create(data, (err, rootId) => {
          if (err) return cb(err)

          const { data } = SSBURI.decompose(keys.id)

          const secretKey = ssbKeysU.toBuffer(keys.private)

          ssb.box2.addGroupKey(keys.id, secretKey)

          entrust(ssb, rootId, undefined, keys.id, secretKey, ssb.id, (err) => {
            if (err) return cb(err)
            else return cb(null, {
              keys,
              rootId
            })
          })
        })
      },

      invite(fusion, peerId, cb) {
        crut.update(fusion.rootId, {
          subtype: 'fusion/invite',
          invited: { add: [peerId] }
        }, cb)
      },

      consent(fusion, cb) {
        crut.update(fusion.rootId, {
          subtype: 'fusion/consent',
          consented: { add: [ssb.id] }
        }, cb)
      },

      read(fusion, cb) {
        crut.read(fusion.rootId, cb)
      },

      tombstone(fusion, reason, cb) {
        crut.tombstone(fusion.rootId, { reason }, cb)
      },

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

          cb(null, notTombstoned(identities))
        })
      },

      tombstoned(cb) {
        allFusions(ssb, crut, (err, identities) => {
          if (err) return cb(err)

          cb(null, tombstoned(identities))
        })
      }
    }
  }
}
