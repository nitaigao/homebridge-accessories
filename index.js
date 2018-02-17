let Service = null
let Characteristic = null

module.exports = homebridge => {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic

  const DoorAccessory = require("./accessories/door")
  homebridge.registerAccessory("homebridge-gate", "Door", DoorAccessory)

  const SwitchAccessory = require("./accessories/switch")
  homebridge.registerAccessory("homebridge-gate", "Switch", SwitchAccessory)
}
