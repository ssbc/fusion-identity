const pDefer = require('p-defer')
const keys = require('ssb-keys')
const Crut = require('ssb-crut')
const fusionSpec = require('./specs/fusion')
const redirectSpec = require('./specs/redirect')
const attestationSpec = require('./specs/attestation')

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

const aliceCrut = new Crut(alice, fusionSpec)
const bobCrut = new Crut(bob, fusionSpec)

let messagesLeft = 2
const bobWait = pDefer()

alice.db.post(m => {
  bob.db.add(m.value, (err) => {
    if (--messagesLeft === 0)
      bobWait.resolve()
  })

  console.log("alice transformation", JSON.stringify(m.value.content, null, 2))
})

bob.db.post(m => {
  console.log("bob transformation", JSON.stringify(m.value.content, null, 2))
})

function getFusionKey() {
  const key = keys.generate().id
  return 'ssb:identity/fusion/' + key.substring(1, key.indexOf('.ed25519'))
}

const fusionId = getFusionKey()

aliceCrut.create({ id: fusionId, members: { add: [alice.id] } }, (err, rootId) => {
  console.log(`alice (${alice.id}) adding self as member`)
  aliceCrut.update(rootId, { members: { add: [bob.id] } }, (err) => {
    if (err) console.error('err: must invite before adding bob as member')
    // console.log(err) // see full error

    aliceCrut.update(rootId, { invited: { add: [bob.id, carol.id] } }, (err) => {
      if (err) throw err
      console.log(`invited bob (${bob.id}) & carol (${carol.id})`)

      bobWait.promise.then(() => {
        bobCrut.update(rootId, { consented: { add: [bob.id] } }, (err) => {
          if (err) throw err

          console.log("bob consents")

          bobCrut.read(rootId, (err, identity) => {

            console.log('\nFINAL STATE:')
            console.log(JSON.stringify(identity, null, 2))

            bobCrut.tombstone(rootId, { reason: 'lost keys!' }, async () => {

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

              const newFusionId = getFusionKey()

              aliceCrut.create({ id: newFusionId, members: { add: [alice.id] } }, (err, rootId) => {
                console.log(`alice (${alice.id}) created a new fusion`)

                const aliceRedirectCrut = new Crut(alice, redirectSpec)

                aliceRedirectCrut.create({ old: fusionId, new: newFusionId }, (err, redirectId) => {
                  console.log(`alice (${alice.id}) created a redirect`)

                  const bobAttCrut = new Crut(bob, attestationSpec)

                  bobAttCrut.create({ target: redirectId, position: 'confirm', reason: 'seems legit' }, (err, attestationId) => {

                    console.log(`bob (${bob.id}) attests redirect`)

                    bobAttCrut.tombstone(attestationId, { reason: 'nevermind' }, (err) => {

                      setTimeout(() => { // wait for writes
                      alice.close()
                        bob.close()
                        carol.close()
                      }, 1000)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
