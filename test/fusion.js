const test = require('tape')
const TestBot = require('scuttle-testbot')
const Fusion = require('../')
const { toCallback } = require('ssb-db2/operators')

const createServer = () => {
  const stack = TestBot
        .use(require('ssb-db2/compat/db'))
        .use(require('ssb-db2/compat/history-stream'))
        .use(require('ssb-db2/compat/feedstate'))
        .use(require('ssb-db2-box2'))

  return stack({
    db2: true,
    box2: {
      alwaysbox2: true
    }
  })
}

test('create fusion identity', (t) => {
  const alice = createServer()

  const fusion = Fusion.init(alice)

  fusion.create((err) => {
    t.error(err, 'no err for create()')

    alice.db.query(
      toCallback((err, messages) => {
        t.equal(messages.length, 2, '2 messages created')
        t.equal(messages[0].value.content.type, 'fusion')
        t.equal(messages[1].value.content.recps.length, 2, '2 recipients')
        t.equal(messages[1].meta.private, true, 'secret is encrypted')
        alice.close(t.end)
      })
    )
  })
})

test('invite + consent', (t) => {
  const alice = createServer()
  const bob = createServer()

  const aliceFusion = Fusion.init(alice)
  const bobFusion = Fusion.init(bob)

  aliceFusion.create((err, fusionData) => {
    t.error(err, 'no err for create()')

    aliceFusion.invite(fusionData, bob.id, (err) => {
      t.error(err, 'no err for invite()')

      aliceFusion.read(fusionData, (err, state) => {
        t.error(err, 'no err for read()')
        t.equal(state.states.length, 1, '1 state')

        const aliceState = state.states[0]

        t.equal(aliceState.invited.length, 1, '1 invited')
        t.equal(aliceState.members.length, 1, '1 member')
        t.equal(aliceState.consented.length, 0, '0 consented')

        TestBot.replicate({ from: alice, to: bob }, (err) => {
          // FIXME: test "open" invitations here

          bobFusion.consent(fusionData, (err) => {
            t.error(err, 'no err for consent()')

            bobFusion.read(fusionData, (err, state) => {
              const bobState = state.states[0]

              t.equal(bobState.invited.length, 1, '1 invited')
              // note members are with proof-of-key
              t.equal(bobState.members.length, 1, '1 member')
              t.equal(bobState.consented.length, 1, '1 consented')

              bob.close()
              alice.close(t.end)
            })
          })
        })
      })
    })
  })
})

test('tombstone', (t) => {
  const alice = createServer()

  const fusion = Fusion.init(alice)

  fusion.create((err, fusionData) => {
    t.error(err, 'no err for create()')

    fusion.all((err, fusions) => {
      t.error(err, 'no err for all()')
      t.equal(fusions.length, 1, '1 fusion')

      fusion.tombstone(fusionData, 'bye', (err) => {
        t.error(err, 'no err for tombstone()')

        fusion.all((err, fusions) => {
          t.equal(fusions.length, 0, '0 active fusions')

          fusion.tombstoned((err, fusions) => {
            t.equal(fusions.length, 1, '1 tombstoned fusions')

            alice.close(t.end)
          })
        })
      })
    })
  })
})
