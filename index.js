const Crut = require('ssb-crut')
const fusionSpec = require('./specs/fusion')
const SSBURI = require('ssb-uri2')
const ssbKeys = require('ssb-keys')

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

module.exports = {
  init(ssb) {
    if (!ssb.box2) throw new Error('fusion identity needs ssb-db2-box2')

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
            else return cb(null, rootId)
          })
        })
      },
    }
  }
}
