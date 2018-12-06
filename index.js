#!/usr/bin/env node

const os = require('os')
const CONFGFILE = require('./config');
const TRANSACTION = require('./transaction');
const SERVICE = require('./service');
const UTIL = require('./util');

const LOG_ERR = 'ERR';
const LOG_SEND = 'SEND';
const LOG_APP = 'APP';
const APP_STATE_RUNNING = 'running';
const APP_STATE_STOPPING = 'stopping';
const SEND_DEVICE_CONNECTED = 'DEVICE_CONNECTED';

const APPLICATION_START_TIMEOUT = 5000; // XXX: Wait HCI devices on system startup

let dataTransmissionTaskId = null;
let applicationState = APP_STATE_RUNNING;

const sensors = {
  macId: null,
  conString: null,
  beaconList: null
}

/*This function is for printing the message with the context */
const print = (context, msg, val = '') => { // TODO: Logging level
  if (!context) {
    console.log('=========================');
  } else if (context === LOG_ERR) {
    console.error(msg, val);
  } else {
    console.log(`[${context}] ${msg}`, val);
  }
};

/*Function to load the app with the config details where all the services are initialised*/
const start = (config) => {
  print(LOG_APP, 'Starting the APP... ');

  print("Calling GPS function.....");
  let gps = SERVICE.getGPSDetails();
  gps.then(function(result) {
    gps = result
    print('GPS Details.......... ');

    print('Calling function to send heartBeatdata');
    UTIL.startheartBeatTask(config, gps);

    print('Calling function to send telemetry data to IoT Hub');
    UTIL.startSendingTask(config, gps);
  }, function(gpsErr) {
    console.log("Error while fetching GPS", gpsErr);
  })
};

/*Function to stop the app in case of any error*/
const stop = () => {
  if (applicationState === APP_STATE_STOPPING) return;
  applicationState = APP_STATE_STOPPING;
  print();
  print(LOG_APP, 'Stopping ...');
  //stopSendingTask();
};

/*Function to initialize the app with all the required configurations*/
const init = () => {
  print(LOG_APP, 'Initialize ...');

  let macId = os.hostname();
  sensors.macId = macId;
  print("MacID :", sensors.macId);

  let beaconList = TRANSACTION.fetchBeaconAssociation(sensors.macId);
  beaconList.then(function(result) {
    sensors.beaconList = JSON.parse(result);
    print("Beacons list :", sensors.beaconList);
  }, function(err) {
    print(LOG_ERR, 'Exception while fetching beacons', err);
  })

  let conString = TRANSACTION.getConnectionString(sensors.macId);
  conString.then(function(result) {
    sensors.conString = result;
    print("Connection String :", sensors.conString);
  }, function(err) {
    print(LOG_ERR, 'Exception while sending task', err);
  })

  process.on('uncaughtException', (err) => {
    print(LOG_ERR, 'uncaughtException:', err);
    try {
      stop();
    } catch (stopErr) {
      print(LOG_ERR, 'Error while stop:', stopErr);
    } finally {
      process.exit(-1);
    }
  });

  return sensors;
};

/*Start of the application*/
const config = init();


setTimeout(() => {
  start(config);
}, APPLICATION_START_TIMEOUT);
