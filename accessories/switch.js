const {
  Service,
  Characteristic
} = require('hap-nodejs')

const RestClient = require("node-rest-client").Client

const GATE_URL = process.env.GATE_URL || "http://gate.lvh.me:3000"
const CHANNEL = "gate"

class SwitchAccessory {
  constructor(log, config) {
    this.service = new Service.Switch(config['name'], 'Switch')

    const params = {
      data: {
        gates: config['gates']
      },
      headers: { "Content-Type": "application/json" }
    }

    this.service
      .getCharacteristic(Characteristic.On)
      .on("set", (value, callback) => {
        if (value) {
          client.post(`${GATE_URL}/toggle`, params, (data, res) => {
            console.log(data)
          })
          setTimeout(() => {
            this.service.setCharacteristic(Characteristic.On, false)
          }, 500)
        }
        callback()
      })

    this.informationService = new Service.AccessoryInformation()

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Nicholas Kostelnik")
      .setCharacteristic(Characteristic.Model, "House Gate")
      .setCharacteristic(Characteristic.SerialNumber, "A")
  }

  getServices() {
    return [this.informationService, this.service]
  }
}

module.exports = SwitchAccessory
