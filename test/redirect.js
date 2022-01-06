const test = require('tape')
const TestBot = require('scuttle-testbot')
const Fusion = require('../')
const { createServer } = require('./helpers')

test('redirect & attest', (t) => {
  const alice = createServer()
  const bob = createServer()

  const fusion = Fusion.init(alice)
  const fusionBob = Fusion.init(bob)

  fusion.create((err, oldFusionData) => {
    t.error(err, 'no err for create()')

    fusion.tombstone(oldFusionData, 'bye', (err) => {
      t.error(err, 'no err for tombstone()')

      fusion.create((err, newFusionData) => {
        t.error(err, 'no err for create()')

        fusion.redirect.create(oldFusionData.rootId, newFusionData.rootId, (err, redirectId) => {
          t.error(err, 'no err for redirect()')

          fusion.attest.create(redirectId, 'confirm', 'testing attestation', (err, attestationId) => {
            t.error(err, 'no err for attest.create()')

            fusion.attest.update(attestationId, 'reject', 'nope', (err) => {
              t.error(err, 'no err for attest.update()')

              TestBot.replicate({ from: alice, to: bob }, (err) => {

                fusionBob.redirect.tombstone(redirectId, 'hax', (err) => {
                  t.equal(err.message,
                          'Invalid update message, failed isValidNextStep, publish aborted',
                          'only author can change redirect')

                  fusionBob.attest.update(attestationId, 'reject', 'nope', (err) => {
                    t.equal(err.message,
                            'Invalid update message, failed isValidNextStep, publish aborted',
                            'only author can change attestation')

                    fusion.attest.read(attestationId, (err, attest) => {
                      t.error(err, 'no err for attest.read()')

                      t.equal(attest.states[0].position, 'reject', 'correct position')

                      fusion.redirects((err, redirects) => {

                        t.equal(redirects[0].old, oldFusionData.rootId, 'correct old')
                        t.equal(redirects[0].new, newFusionData.rootId, 'correct new')

                        fusion.attestations(redirectId, (err, attestations) => {
                          t.equal(attestations.length, 1, '1 attestation')

                          fusion.attest.tombstone(attestationId, 'testing removing attestation', (err) => {
                            t.error(err, 'no err for attest.tombstone()')

                            fusion.attestations(redirectId, (err, attestations) => {
                              t.equal(attestations.length, 0, '0 attestations')

                              bob.close()
                              alice.close(t.end)
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
      })
    })
  })
})
