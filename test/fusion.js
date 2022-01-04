const test = require('tape')
const TestBot = require('scuttle-testbot')
const ssbKeys = require('ssb-keys')
const Fusion = require('../')
const { toCallback } = require('ssb-db2/operators')

const createServer = (name, keys, startUnclean = false) => {
  const stack = TestBot
        .use(require('ssb-db2/compat/db'))
        .use(require('ssb-db2/compat/history-stream'))
        .use(require('ssb-db2/compat/feedstate'))
        .use(require('ssb-db2-box2'))

  const opts = {
    db2: true,
    box2: {
      alwaysbox2: true
    }
  }

  if (name && keys) {
    opts.name = name
    opts.keys = keys
    opts.startUnclean = startUnclean
  }

  const ssb = stack(opts)

  const dm_hex = '4e2ce5ca70cd12cc0cee0a5285b61fbc3b5f4042287858e613f9a8bf98a70d39'
  ssb.box2.addOwnDMKey(Buffer.from(dm_hex, 'hex'))

  return ssb
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

          bobFusion.invitations((err, invited) => {
            t.error(err, 'no err for invitations()')
            t.equal(invited.length, 1, '1 open invitation')

            bobFusion.consent(fusionData, (err) => {
              t.error(err, 'no err for consent()')

              bobFusion.invitations((err, invited) => {
                t.error(err, 'no err for invitations()')
                t.equal(invited.length, 0, '0 open invitation')

                bobFusion.read(fusionData, (err, state) => {
                  const bobState = state.states[0]

                  t.equal(bobState.invited.length, 1, '1 invited')
                  // note members are with proof-of-key
                  t.equal(bobState.members.length, 1, '1 member')
                  t.equal(bobState.consented.length, 1, '1 consented')

                  TestBot.replicate({ from: bob, to: alice }, (err) => {

                    // alice should now post a entrust, this takes a little while
                    setTimeout(() => {
                      TestBot.replicate({ from: alice, to: bob }, (err) => {
                        // bob should now add to members (proof of key)

                        // bob should now post a proof of key, this takes a little while
                        setTimeout(() => {
                          bobFusion.read(fusionData, (err, state) => {
                            const bobState = state.states[0]

                            t.equal(bobState.invited.length, 1, '1 invited')
                            // note members are with proof-of-key
                            t.equal(bobState.members.length, 2, '2 members')
                            t.equal(bobState.consented.length, 1, '1 consented')

                            bob.close()
                            alice.close(t.end)
                          })
                        }, 500)
                      })
                    }, 500)
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

test('redirect & attest', (t) => {
  const alice = createServer()

  const fusion = Fusion.init(alice)

  fusion.create((err, oldFusionData) => {
    t.error(err, 'no err for create()')

    fusion.tombstone(oldFusionData, 'bye', (err) => {
      t.error(err, 'no err for tombstone()')

      fusion.create((err, newFusionData) => {
        t.error(err, 'no err for create()')

        fusion.redirect(oldFusionData.id, newFusionData.id, (err, redirectId) => {
          t.error(err, 'no err for redirect()')

          fusion.attest(redirectId, 'confirm', 'testing attestation', (err, attestId) => {
            t.error(err, 'no err for attest()')

            fusion.removeAttestation(attestId, 'testing removing attestation', (err) => {
              t.error(err, 'no err for remove attestation()')

              alice.close(t.end)
            })
          })
        })
      })
    })
  })
})

test('keys loaded on startup', (t) => {
  const keys = ssbKeys.generate()
  let alice = createServer('alice', keys)

  const aliceFusion = Fusion.init(alice)

  aliceFusion.create((err, fusionData) => {
    t.error(err, 'no err for create()')

    alice.close(() => {
      // simulate we restarted and load state again
      alice = createServer('alice', keys, true)

      const aliceFusion2 = Fusion.init(alice)

      alice.db.publish({
        type: 'post',
        message: 'hello world',
        recps: [fusionData.keys.id]
      }, (err, msg) => {
        t.error(err, 'no err for publish()')

        t.equal(typeof msg.value.content, 'string', 'message is encrypted')

        alice.db.get(msg.key, (err, dbMsg) => {
          t.equal(dbMsg.content.message, 'hello world', 'can read message')

          alice.close(t.end)
        })
      })
    })
  })
})
