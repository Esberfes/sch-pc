const { Network } = require('neataptic')
console.log('¡Estoy aquí!')
class Creature {
  constructor(name) {
    this.name = name
    // Red: 2 entradas, 1 salida
    this.brain = new Network(2, 1)
  }

  sense(input) {
    return this.brain.activate(input)
  }

  learn(input, expected) {
    if (!Array.isArray(input) || input.length !== 2) {
      throw new Error(`Input must be an array of length 2. Got: ${input}`)
    }
    if (!Array.isArray(expected)) {
      expected = [Number(expected)]
    }
    if (expected.length !== 1) {
      throw new Error(`Expected output must be an array of length 1. Got: ${expected}`)
    }
    this.brain.activate(input)
    this.brain.propagate(0.3, 0, true, expected)
  }
}

module.exports = Creature
