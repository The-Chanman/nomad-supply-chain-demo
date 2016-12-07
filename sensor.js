const Nomad = require('nomad-stream')
const moment = require('moment')
const Particle = require('particle-api-js')

const credentials = require('./particle-login')

const particle = new Particle()
const nomad = new Nomad()

// Particle Device Setup
// Atomic node 1
const deviceID =  <This needs to be set>

let instance = null
let lastPub = null
let token

const defaultPublishData = { 
  lever: {
    data: "",
    time: "",
    description: "The state of the lever in region 3"
  }
}
const timeBetween = 15 * 60 * 1000 //15 minutes
const timeThreshold = 4 * 60 * 60 * 1000 // 4 minutes

class DataMaintainer {
  constructor(){
    this.data = defaultPublishData
  }
  setValue(key, value){
    let cleanedKey = this.cleanKey(key)
    if(cleanedKey in this.data){
      this.data[cleanedKey].data = value.data
      this.data[cleanedKey].time = value.time
    } else {
      this.data[cleanedKey] = value
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
    return this.data["lever"]["data"] && this.data["lever"]["time"]
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

particle.login(credentials)
  .then(res => {
    token = res.body.access_token
    console.log(`Got Token: ${token}`)
    return nomad.prepareToPublish()
  })
  .then((n) => {
    instance = n
    return instance.publishRoot('hello this atomic node 1 of supply chain demo')
  })
  .then(() => {
    //declaring last publish date
    lastPub = getTime()
    return particle.getEventStream({ deviceId: deviceID, auth: token })
  })
  .then(s => {
    stream = s
    stream.on('event', data => {
      console.log(data)
      try{dataManager.setValue(data.name, {data: data.data, time: data.published_at})}
      catch(err){
        console.log("DataMaintainer failed with error of " + err)
      }
      // this determines frequency of transmission 
      let currentTime = getTime()
      let timeSince = currentTime - lastPub
      if (timeSince >= timeBetween){

        console.log("timeSince >= timeBetween")

        if (dataManager.isAllFilled){
          // publish if everything is full
          console.log("***************************************************************************************")
          console.log(dataManager.getAll())
          console.log("***************************************************************************************")

          instance.publish(dataManager.toString())
            .catch(err => console.log(`Error: ${JSON.stringify(err)}`))
          dataManager.clear()  
          lastPub = currentTime
        }
      }
      // if haven't receieved anything in the time frame
      if (timeSince >= timeThreshold){
        // publish what we got
        instance.publish(dataManager.toString())
          .catch(err => console.log(`Error: ${JSON.stringify(err)}`))
        console.log("***************************************************************************************")
        console.log(dataManager.getAll())
        console.log("***************************************************************************************")
        dataManager.clear()  
        lastPub = currentTime
      }
    })
  })
  .catch(err => console.log(`Error: ${JSON.stringify(err)}`))