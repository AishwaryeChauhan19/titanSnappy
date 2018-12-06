/*
 * Created by suman.sharma on 26/10/2018
 */
const MQTT = require('azure-iot-device-mqtt').Mqtt;
const DeviceClient = require('azure-iot-device').Client
const Message = require('azure-iot-device').Message;
const connectivity = require('connectivity')
const CONFGFILE = require('./config');
const TRANSACTION = require('./transaction');
const SERVICE = require('./service');

const SEND_DEVICE_CONNECTED = 'DEVICE_CONNECTED';

//let date = new Date();
let connectionString;
let deviceId;
let client;
let message;
let networkConn = false;


/*This function is for printing the output based on the response received */
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

/*This function is to send the keep alive information of the devices for every 5 seconds to IoT Hub*/
const sendheartBeatState = (config, gps, status) => {
  console.log("Inside sendheartBeatState....");
  let heartBeatdata;
  deviceId = config.macId;
  connectionString = config.conString;

  console.log("Connection String :", connectionString);

  client = DeviceClient.fromConnectionString(connectionString, MQTT);

  heartBeatdata = JSON.stringify({
    gatewayId: config.macId,
    device_status: status,
    message_type: "HeartBeat",
    last_recorded_latitude: 12.8376,
    last_recorded_longitude: 77.6582,
    last_recorded_gps_time: "2018-10-25T09:02:17.748Z",
    current_latitude: gps.current_latitude, //payload.latitude,
    current_longitude: gps.current_longitude, //payload.longitude,
    current_gps_time: gps.current_time,
    current_system_time: new Date()
  });
  console.log("heartBeatdata :", heartBeatdata);
  message = new Message(heartBeatdata);
  client.sendEvent(message, printResultFor('sendheartBeatState'));
  console.log(`Publish to Azure ${heartBeatdata}`);
};

/*This function is to send the data to cloud in JSON format*/
const send = (config, gps, status) => {
  console.log('Inside send function.....');
  let data;
  deviceId = config.macId;
  connectionString = config.conString;
  console.log("Connection String :", connectionString);

  client = DeviceClient.fromConnectionString(connectionString, MQTT);
  let data1 = SERVICE.scanBeaconReadings(config);
  data1.then(function(result) {
      data1 = result;
      if (data1.alert == true) {
        data = JSON.stringify({
          gatewayId: config.macId,
          device_status: status,
          alert: data1.alert,
          message_type: "Alert",
          last_recorded_latitude: 12.8376,
          last_recorded_longitude: 77.6582,
          last_recorded_gps_time: "2018-10-25T09:02:17.748Z",
          current_latitude: gps.current_latitude,
          current_longitude: gps.current_longitude,
          current_gps_time: gps.current_time,
          current_system_time: new Date(),
          sensor_capture_status: "OK",
          sensor_count: data1.sensor_Values.length,
          sensor_Values: data1.sensor_Values
        });
      } else {
        data = JSON.stringify({
          gatewayId: config.macId,
          device_status: status,
          alert: data1.alert,
          message_type: "Telemetry",
          last_recorded_latitude: 12.8376,
          last_recorded_longitude: 77.6582,
          last_recorded_gps_time: "2018-10-25T09:02:17.748Z",
          current_latitude: gps.current_latitude,
          current_longitude: gps.current_longitude,
          current_gps_time: gps.current_time,
          current_system_time: new Date(),
          sensor_capture_status: "OK",
          sensor_count: data1.sensor_Values.length,
          sensor_Values: data1.sensor_Values
        });
      }
      message = new Message(data);
      client.sendEvent(message, printResultFor('send'));
      console.log(`Publish to Azure ${data}`);
    }),
    function(err) {
      console.log("sensor data not available");
    }
};

/*Function to send the data to cloud*/
const sendDeviceState = (config, data, gps) => {
  send(config, data, gps, SEND_DEVICE_CONNECTED);
};

/*Function to send the data to cloud after certain interval of time*/
const startSendingTask = (config, gps) => {
  return setInterval(() => {
    sendDeviceState(config, gps);
  }, 15000);
};

/*Function to send the heartbeat data to cloud after certain interval of time*/
const startheartBeatTask = (config, gps) => {
  return setInterval(() => {
    sendheartBeatState(config, gps, SEND_DEVICE_CONNECTED);
  }, 5000);
};

module.exports = {
  send: send,
  sendDeviceState: sendDeviceState,
  startSendingTask: startSendingTask,
  startheartBeatTask: startheartBeatTask,
  sendheartBeatState: sendheartBeatState
}