module.exports = {
  type: 'fusion/redirect',
  tangle: 'redirect',

  staticProps: {
    old: { $ref: '#/definitions/messageId', required: true },
    new: { $ref: '#/definitions/messageId', required: true }
  },
}
