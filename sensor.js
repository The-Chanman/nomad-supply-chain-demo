const Nomad = require('nomad-stream')
const moment = require('moment')

const credentials = require('./twilio-login.js')
const phoneNumbers = require('./phone-numbers.js')

const nomad = new Nomad()

//require the Twilio module and create a REST client
const client = require('twilio')(credentials.accountSid, credentials.authToken)

// device atomic node ids
const subscriptions = ['QmVUYR9yGtzzGfewV4Gi6iitsxWjNQo6o7DeyNbFG5SUA4', 'QmPwoNW2z4zpzT9pbUKAAPCZXERYqGm4bdk2n6FbBGEfWM']

let instance = null
let lastPub = null
let notificationBody = ""

const frequency = 30 * 1000 // 30 seconds 
const timeThreshold = 4 * 60 * 60 * 1000 // 4 minutes
const toNumber = phoneNumbers.toNumber
const fromNumber = phoneNumbers.fromNumber

const defaultPublishData = { 
  [subscriptions[0]]: {
    sensor: {
      data: '',
      time: '',
      description: '' 
    }
  },
  [subscriptions[1]]: {
    sensor: {
      data: '',
      time: '',
      description: '' 
    }
  }
}

// How we manager the data
class DataMaintainer {
  constructor(){
    this.data = defaultPublishData
  }
  setValue(id, key, value){
    let cleanedKey = this.cleanKey(key)
    if(cleanedKey in this.data[id]){
      this.data[id][cleanedKey].data = value.data
      this.data[id][cleanedKey].time = value.time
      this.data[id][cleanedKey].description = value.description
    } else {
      this.data[id][cleanedKey] = value
    }
  }
  cleanKey(key){
    let cleanedKey = key.replace(/\s+/, '\x01').split('\x01')[0]
    cleanedKey = cleanedKey.toLowerCase()
    return cleanedKey
  }
  getAll(){
    return this.data
  }
  isAllFilled(){
    return this.data[subscriptions[0]]['sensor']["data"] && this.data[subscriptions[0]]['sensor']["time"] && this.data[subscriptions[1]]['sensor']["data"] && this.data[subscriptions[1]]['sensor']["time"]
  }
  clear(){
    this.data = defaultPublishData
  }
  toString(){
    return JSON.stringify(this.data)
  }
}

function getTime() {
  return new moment()
}

//init data manager
let dataManager = new DataMaintainer()

lastPub = getTime()
nomad.subscribe(subscriptions, function(message) {
  console.log("Receieved a message for node " + message.id)
  // console.log("Message was " + message.message)
  let messageData = JSON.parse(message.message)
  console.log(messageData)

  try{
    dataManager.setValue(message.id, Object.keys(messageData)[0],{data: messageData[Object.keys(messageData)[0]].data, time: messageData[Object.keys(messageData)[0]].time, description: messageData[Object.keys(messageData)[0]].description})
  }
  catch(err){
    console.log("DataMaintainer failed with error of " + err)
  }
  let currentTime = getTime()
  let timeSince = currentTime - lastPub

  if (timeSince >= frequency){
    console.log('===================================> timeSince >= timeBetween')
    console.log(dataManager.toString())
    let currentRecord = dataManager.getAll()
    let sensorOneData = currentRecord[Object.keys(currentRecord)[0]]['sensor']["data"]
    let sensorTwoData = currentRecord[Object.keys(currentRecord)[1]]['sensor']["data"]
    console.log(sensorOneData)
    console.log(sensorTwoData)
    if (sensorOneData == 'Active' && sensorTwoData == 'Fish'){
      console.log("***************************************************************************************")
      console.log(`we are now going to notify relevant parties since there is an Active Fish`)
      console.log("***************************************************************************************")

      notificationBody = `THERE IS AN ACTIVE FISH`

      client.messages.create({
        to: toNumber,
        from: fromNumber,
        body: notificationBody,
      }, function (err, message) {
        console.log(err)
        console.log(message)
      })
      dataManager.clear()
      lastPub = currentTime
    }
  }
  if (timeSince >= timeThreshold){
    // let them know the node is still online
   console.log("===================================>   timeSince >= timeThreshold")
    console.log("***************************************************************************************")
    console.log('Heartbeat, I Twilio composite node is ALIVE <3')
    console.log("***************************************************************************************")
    
    messageBody = 'Heartbeat, I Twilio composite node is ALIVE <3'

    client.messages.create({
      to: toNumber,
      from: fromNumber,
      body: messageBody,
    }, function (err, message) {
      console.log(err)
      console.log(message)
    })
    dataManager.clear()
    lastPub = currentTime
  }
})