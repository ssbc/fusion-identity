const Overwrite = require('@tangle/overwrite')

module.exports = {
  type: 'fusion/attestation',
  tangle: 'attestation',

  staticProps: {
    target: { $ref: '#/definitions/messageId', required: true }
  },

  props: {
    position: Overwrite(), // FIXME: enum: confirm|reject|null & required!
    description: Overwrite() // optional
  },

  isValidNextStep ({ tips, graph }, node) {
    const { position, description, tombstone } = node.data

    if (!tombstone)
      if (!position || (position.set !== 'confirm' && position.set !== 'reject'))
        return false

    if (graph) { // only for updates
      const rootKey = graph.rootKeys[0]
      const rootNode = graph.nodes.find(x => x.key === rootKey)
      if (rootNode && rootNode.author !== node.author)
        return false
    }

    return true
  }
}
