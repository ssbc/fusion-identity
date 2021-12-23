const keys = require('ssb-keys')
const Crut = require('ssb-crut')
const spec = require('./spec')
const pDefer = require('p-defer')

const createServer = () => {
  const stack = require('scuttle-testbot')
        .use(require('ssb-db2/compat/db'))
        .use(require('ssb-db2/compat/history-stream'))
        .use(require('ssb-db2/compat/feedstate'))

  return stack({ db2: true })
}

const alice = createServer()
const bob = createServer()
const carol = createServer()

const crut = new Crut(alice, spec)
const bobCrut = new Crut(bob, spec)

let messagesLeft = 2
const bobWait = pDefer()

alice.db.post(m => {
  bob.db.add(m.value, (err) => {
    if (--messagesLeft === 0)
      bobWait.resolve()
  })

  console.log("transformation", JSON.stringify(m.value.content, null, 2))
})

const key = keys.generate().id
const fusionId = 'ssb:identity/fusion/' + key.substring(1, key.indexOf('.ed25519'))

crut.create({ id: fusionId, members: { add: [alice.id] } }, (err, rootId) => {
  console.log(`alice (${alice.id}) adding self as member`)
  crut.update(rootId, { members: { add: [bob.id] } }, (err) => {
    if (err) console.error('err: must invite before adding bob as member')
    // console.log(err) // see full error

    crut.update(rootId, { invited: { add: [bob.id, carol.id] } }, (err) => {
      if (err) throw err
      console.log(`invited bob (${bob.id}) & carol (${carol.id})`)

      bobWait.promise.then(() => {
        bobCrut.update(rootId, { consented: { add: [bob.id] } }, (err) => {
          if (err) throw err

          console.log("bob consents")

          bobCrut.read(rootId, (err, identity) => {

            console.log('\nFINAL STATE:')
            console.log(JSON.stringify(identity, null, 2))

            bobCrut.tombstone(rootId, { reason: 'goodbye!' }, async () => {

              console.log("tombstoned fusion")

              const { where, and, slowEqual, type, toPromise } = require('ssb-db2/operators')

              const identityRoots = await bob.db.query(
                where(
                  and(
                    slowEqual('value.content.tangles.fusion.root', null),
                    type('fusion')
                  )
                ), toPromise()
              )

              const identities = await Promise.all(identityRoots.map((root) => {
                return bobCrut.read(root.key)
              }))

              console.log("all identities", JSON.stringify(identities, null, 2))

              alice.close()
              bob.close()
              carol.close()
            })
          })
        })
      })
    })
  })
})
