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

    if (graph) { // only for updates
      const rootKey = graph.rootKeys[0]
      const rootMsg = graph.nodes.find(x => x.key === rootKey)
      if (rootMsg && rootMsg.value.author !== msg.value.author)
        return false
    }

    return true
  }
}
