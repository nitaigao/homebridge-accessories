const { Service, Characteristic } = require("hap-nodejs")

const Redis = require("redis")
const RestClient = require("node-rest-client").Client

const client = new RestClient()
const redis = Redis.createClient()

const GATE_URL = process.env.GATE_URL || "http://gate.lvh.me:3000"
const CHANNEL = "gate"

class DoorAccessory {
  constructor(log, config) {
    this.targetState = 0

    this.service = new Service.GarageDoorOpener(config["name"], "Door")

    this.service.setCharacteristic(
      Characteristic.TargetDoorState,
      Characteristic.TargetDoorState.CLOSED
    )
    this.service.setCharacteristic(
      Characteristic.CurrentDoorState,
      Characteristic.CurrentDoorState.CLOSED
    )

    this.service
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on("get", callback => {
        console.log("GET CurrentDoorState")
        client.get(`${GATE_URL}/status`, (data, error) => {
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
          console.log("failed")
          callback("Cant get gate status")
        })
      })

    redis.on("message", (channel, message) => {
      console.log(channel, message)
      if (channel === CHANNEL) {
        if (message === "open") {
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.OPEN
          )
        }
        if (message === "opening") {
          this.targetState = Characteristic.TargetDoorState.OPEN
          this.service
            .getCharacteristic(Characteristic.TargetDoorState)
            .updateValue(Characteristic.TargetDoorState.OPEN)
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
          this.targetState = Characteristic.TargetDoorState.CLOSED
          this.service
            .getCharacteristic(Characteristic.TargetDoorState)
            .updateValue(Characteristic.TargetDoorState.CLOSED)
          this.service.setCharacteristic(
            Characteristic.CurrentDoorState,
            Characteristic.CurrentDoorState.CLOSING
          )
        }
      }
      console.log(this.targetState)
    })

    redis.subscribe(CHANNEL)

    this.service
      .getCharacteristic(Characteristic.TargetDoorState)
      .on("get", callback => {
        console.log("GET TargetDoorState: " + this.targetState)
        callback(this.targetState)
      })
      .on("set", (targetState, callback) => {
        this.targetState = targetState
        callback()
        console.log("SET TargetDoorState: " + targetState)
        if (targetState == Characteristic.TargetDoorState.OPEN) {
          client.post(`${GATE_URL}/open`, {}, (data, resp) => {})
          return
        }

        if (targetState == Characteristic.TargetDoorState.CLOSED) {
          client.post(`${GATE_URL}/close`, {}, (data, resp) => {})
          return
        }
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

module.exports = DoorAccessory
