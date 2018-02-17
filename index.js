const Redis = require("redis")
const RestClient = require("node-rest-client").Client

const client = new RestClient()
const redis = Redis.createClient()

const GATE_URL = process.env.GATE_URL || "http://gate.lvh.me:3000"
const CHANNEL = "gate"

let Service = null
let Characteristic = null

module.exports = homebridge => {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory("homebridge-gate", "Gate", GateAccessory)
}

class GateAccessory {
  constructor(log, config) {
    this.targetState = 0

    this.service = new Service.GarageDoorOpener("Gate", "Short Name")

    this.service
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on("get", callback => {
        console.log("GET CurrentDoorState")
        client.get(`${GATE_URL}/status`, (data, error) => {
          console.log(data)
          if (data.status === "open") {
            callback(null, Characteristic.CurrentDoorState.OPEN)
            return
          }
          if (data.status === "opening") {
            callback(null, Characteristic.CurrentDoorState.OPENING)
            return
          }
          if (data.status === "closed") {
            callback(null, Characteristic.CurrentDoorState.CLOSED)
            return
          }
          if (data.status === "closing") {
            callback(null, Characteristic.CurrentDoorState.CLOSING)
            return
          }
          callback("Cant get gate status")
        })
      })

    redis.on("message", (channel, message) => {
      if (channel === CHANNEL) {
        if (message === "open") {
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.OPEN
          )
        }
        if (message === "opening") {
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.OPENING
          )
        }
        if (message === "closed") {
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.CLOSED
          )
        }
        if (message === "closing") {
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.CLOSING
          )
        }
      }
    })

    redis.subscribe(CHANNEL)

    this.service
      .getCharacteristic(Characteristic.TargetDoorState)
      .on("get", callback => {
        console.log("GET TargetDoorState: " + this.targetState)
        callback(this.targetState)
      })
      .on("set", (targetState, callback) => {
        console.log("SET TargetDoorState: " + targetState)
        if (targetState == Characteristic.TargetDoorState.OPEN) {
          client.post(`${GATE_URL}/open`, {}, (data, resp) => {
            this.targetState = targetState
            callback()
          })
          return
        }

        if (targetState == Characteristic.TargetDoorState.CLOSED) {
          client.post(`${GATE_URL}/close`, {}, (data, resp) => {
            this.targetState = targetState
            callback()
          })
          return
        }

        callback()
      })

    this.informationService = new Service.AccessoryInformation()

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Nicholas Kostelnik")
      .setCharacteristic(Characteristic.Model, "House Gate")
      .setCharacteristic(Characteristic.SerialNumber, "A")

    this.service.setCharacteristic(
      Characteristic.CurrentDoorState,
      Characteristic.CurrentDoorState.CLOSED
    )
  }

  getServices() {
    return [this.informationService, this.service]
  }
}
