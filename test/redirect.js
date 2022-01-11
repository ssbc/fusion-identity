const test = require('tape')
const TestBot = require('scuttle-testbot')
const Fusion = require('../')
const FusionRedirect = require('../redirect')
const { createServer } = require('./helpers')

test('redirect & attest', (t) => {
  const alice = createServer()
  const bob = createServer()

  const fusion = Fusion.init(alice)
  const fusionRA = FusionRedirect.init(alice)
  const fusionBob = Fusion.init(bob)
  const fusionBobRA = FusionRedirect.init(bob)

  fusion.create((err, oldFusionData) => {
    t.error(err, 'no err for create()')

    fusion.tombstone(oldFusionData, 'bye', (err) => {
      t.error(err, 'no err for tombstone()')

      fusion.create((err, newFusionData) => {
        t.error(err, 'no err for create()')

        fusionRA.redirect.create(oldFusionData.rootId, newFusionData.rootId, (err, redirectId) => {
          t.error(err, 'no err for redirect()')

          fusionRA.attest.create(redirectId, 'confirm', 'testing attestation', (err, attestationId) => {
            t.error(err, 'no err for attest.create()')

            fusionRA.attest.update(attestationId, 'reject', 'nope', (err) => {
              t.error(err, 'no err for attest.update()')

              TestBot.replicate({ from: alice, to: bob }, (err) => {

                fusionBobRA.redirect.tombstone(redirectId, 'hax', (err) => {
                  t.equal(err.message,
                          'Invalid update message, failed isValidNextStep, publish aborted',
                          'only author can change redirect')

                  fusionBobRA.attest.update(attestationId, 'reject', 'nope', (err) => {
                    t.equal(err.message,
                            'Invalid update message, failed isValidNextStep, publish aborted',
                            'only author can change attestation')

                    fusionRA.attest.read(attestationId, (err, attest) => {
                      t.error(err, 'no err for attest.read()')

                      t.equal(attest.states[0].position, 'reject', 'correct position')

                      fusionRA.redirect.all((err, redirects) => {

                        t.equal(redirects[0].old, oldFusionData.rootId, 'correct old')
                        t.equal(redirects[0].new, newFusionData.rootId, 'correct new')

                        fusionRA.attest.all(redirectId, (err, attestations) => {
                          t.equal(attestations.length, 1, '1 attestation')

                          fusionRA.attest.tombstone(attestationId, 'testing removing attestation', (err) => {
                            t.error(err, 'no err for attest.tombstone()')

                            fusionRA.attest.all(redirectId, (err, attestations) => {
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
