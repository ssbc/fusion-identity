module.exports = {
  type: 'fusion/redirect',
  tangle: 'redirect',

  staticProps: {
    old: { $ref: '#/definitions/messageId', required: true },
    new: { $ref: '#/definitions/messageId', required: true }
  },

  isValidNextStep ({ tips, graph }, node) {
    if (graph) { // only for updates
      const rootKey = graph.rootKeys[0]
      const rootNode = graph.nodes.find(x => x.key === rootKey)
      if (rootNode && rootNode.author !== node.author)
        return false
    }

    return true
  }
}
