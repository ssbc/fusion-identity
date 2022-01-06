const test = require('tape')
const Fusion = require('../')
const { createServer } = require('./helpers')

test('redirect & attest', (t) => {
  const alice = createServer()

  /*
  alice.db.post(msg => {
    if (msg.value.content.type === 'fusion/redirect')
      console.log(JSON.stringify(msg, null, 2))
  })
  */
  
  const fusion = Fusion.init(alice)

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
