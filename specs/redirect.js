module.exports = {
  type: 'fusion/redirect',
  tangle: 'redirect',

  staticProps: {
    old: { $ref: '#/definitions/messageId', required: true },
    new: { $ref: '#/definitions/messageId', required: true }
  },

  isValidNextStep ({ accT, graph }, msg) {
    if (graph) { // only for updates
      const rootKey = graph.rootKeys[0]
      const rootMsg = graph.nodes.find(x => x.key === rootKey)
      if (rootMsg && rootMsg.value.author !== msg.value.author)
        return false
    }

    return true
  }
}
