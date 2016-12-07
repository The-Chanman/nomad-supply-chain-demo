const Nomad = require('nomad-stream')
const moment = require('moment')

const credentials = require('./twilio-login.js')
const phoneNumbers = require('./phone-numbers.js')

const nomad = new Nomad()

//require the Twilio module and create a REST client
const client = require('twilio')(credentials.accountSid, credentials.authToken)

// device atomic node ids
const subscriptions = ['QmXeYj4i32SAynbS43jWuJSinVRveZQ7YoMWL9RsfkDE6h', '', '']

let instance = null
let lastPub = null
let notificationBody = ""

const frequency = 15 * 60 * 1000 //15 minutes
const timeThreshold = 4 * 60 * 60 * 1000 // 4 minutes
const toNumber = phoneNumbers.toNumber
const fromNumber = phoneNumbers.fromNumber

const defaultPublishData = { 
  [subscriptions[0]]: {
    lever: {
      data: '',
      time: '',
      description: '' 
    }
  },
  [subscriptions[1]]: {
    lever: {
      data: '',
      time: '',
      description: '' 
    }
  },
  [subscriptions[2]]: {
    lever: {
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
     ***************************************figure this out later***************************************
    return this.data[subscriptions[0]]["data"] && this.data[subscriptions[0]]["time"] && this.data["uv"]["data"] && this.data["uv"]["time"]
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
  console.log("Message was " + message.message)
  const messageData = JSON.parse(message.message)

  try{
    dataManager.setValue(message.id, <FILL IN WITH KEY>, <FILL IN WITH VALUE>)
  }
  catch(err){
    console.log("DataMaintainer failed with error of " + err)
  }
  let currentTime = getTime()
  let timeSince = currentTime - lastPub
  if (timeSince >= frequency){
    console.log('===================================> timeSince >= timeBetween')
    if (<criteria are met>){
      console.log("***************************************************************************************")
      console.log(`we are now going to notify relevant parties since ${<criteria have been met>}`)
      console.log("***************************************************************************************")

      notificationBody = `${<What we are going to notify them of>}`

      client.messages.create({
        to: toNumber,
        from: fromNumber,
        body: messageBody,
      }, function (err, message) {
        console.log(err)
        console.log(message)
      })

      lastPub = currentTime
    }
  }
  if (timeSince >= timeThreshold){
    // let them know the node is still online
    <this can be a text or publish if there is a publish then we nned a new variable to kkep track of timesince last publish and on to keep track of the state>
  }
})