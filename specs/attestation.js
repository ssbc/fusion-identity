const Overwrite = require('@tangle/overwrite')

module.exports = {
  type: 'fusion/attestation',
  tangle: 'attestation',

  staticProps: {
    target: { $ref: '#/definitions/messageId', required: true }
  },

  props: {
    position: Overwrite(), // FIXME: enum: confirm|reject|null & required!
    reason: Overwrite() // optional
  },

  isValidNextStep ({ accT, graph }, msg) {
    const { position, reason, tombstone } = msg.value.content

    if (!tombstone)
      if (!position || (position.set !== 'confirm' && position.set !== 'reject'))
        return false

    return true
  }
}
