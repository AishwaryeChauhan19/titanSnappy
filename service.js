/*
 * Created by suman.sharma on 26/10/2018
 */
const noble = require('noble');
const SerialPort = require('serialport');
const nmea = require('nmea');
const TRANSACTION = require('./transaction');

let telemetryData = {
  alert: false,
  count: 0,
  sensor_Values: []
}

let gps = {
  current_time: 0,
  current_latitude: 0,
  current_longitude: 0,
}

/*Function to fetch the GPS of the device which is connected via USB to the gateway
  This includes latitude, longitude and current timestamp of the GPS device*/
const getGPSDetails = () => {
  let lat = 0;
  let long = 0;
  let utc_time = 0;
  const Readline = SerialPort.parsers.Readline;
  const parser1 = new Readline();
  ///dev/serial-port-067b2303
  const port = new SerialPort('/dev/ttyUSB0', {
    baudRate: 4800,
  });
  port.pipe(parser1);

  return new Promise(function(resolve, reject) {
    parser1.on('data', function(line) {
      try {
        if (nmea.parse(line).sentence == "RMC") {
          utc_time = (nmea.parse(line).timestamp) * 1;
          lat = nmea.parse(line).lat;
          long = nmea.parse(line).lon;
          if (utc_time != 'undefined') {
            let date = new Date();
            //console.log("Time Stamp: " + nmea.parse(line).timestamp, "Latitude: " + lat / 100, "Longitude: " + long / 100);
            if (lat != '' && long != '') {
              gps.current_time = date;
              gps.latitude = lat / 100;
              gps.longitude = long / 100;
              resolve(gps);
              //console.log("GPS", gps);
            } else {
              let gpsFromAdditionalSource = TRANSACTION.getGPSFromAnotherDevice();
              gpsFromAdditionalSource.then(function(result) {
                gpsFromAdditionalSource = JSON.parse(result);
                gps.current_time = gpsFromAdditionalSource.TIMESTAMP;
                gps.current_latitude = gpsFromAdditionalSource.LATITUDE;
                gps.current_longitude = gpsFromAdditionalSource.LONGITUDE;
                resolve(gps);
                //console.log(gps);
              }, function(gpsErr) {
                console.log("Error from additional gps ", gpsErr);
              })
            }
          }
        }
      } catch (error) {
        reject(error);
        console.error("Got bad packet:", line, error);
      }
      //console.log(nmea.parse(line));
    });
  })
}


/*This function scans for the beacons available and compares with
 the list of beacons, to read the data from each of available beacons
 and send the data to the cloud*/
const scanBeaconReadings = (config) => {
  //let alert=false;

  let macId = config.macId;
  telemetryData.alert = false;
  delete telemetryData.tempAlert;
  console.log("MacID :", macId);
  telemetryData.sensor_Values = [];

  return new Promise(function(resolve, reject) {

    console.log("Fetching list of beacons ....");

    beacons = config.beaconList;
    //console.log("List of beacons :", beacons);

    let sensorData = beacons && beacons.Beacons;
    //console.log("sensorData :", sensorData);
    let newbeacon_check = 1;

    let scanned_beacons = [];
    //  scanned_beacons = null;


    console.log("sensor data length :: ", sensorData.length);
    noble.startScanning();
    //console.log("Starting noble scanning....");
    noble.on('discover', function(peripheral) {
      let beaconid = peripheral.uuid;
      //console.log("beaconid :", beaconid);
      let rssi = peripheral.rssi;

      //TODO setGlobalAlert

      //console.log("Entering for loop to check for the available list of beacons...... ");
      for (i = 0; i < sensorData.length; i++) {

        var data = {
          sensorID: 0,
          temperature: 0,
          humidity: 0,
          temperature_alert: false,
          humidity_alert: false,
          shock_alert: false,
          tamper_alert: false
        };

        //console.log("Entering For loop for new beacon check");
        for (j = 0; j < scanned_beacons.length; j++) {
          if (beaconid == scanned_beacons[j])
            newbeacon_check = 0;
        }

        let temperature;
        let humidity;
        let measurement_data;

        if (beaconid == sensorData[i].BeaconID && newbeacon_check != 0) {
          measurement_data = peripheral.advertisement.manufacturerData;
          humidity = (measurement_data[4] + '.' + measurement_data[5]) * 1;

          if ((measurement_data[0]) * 1 == 0) {
            temperature = (measurement_data[1] + '.' + measurement_data[2]) * 1;
          } else {
            temperature = (measurement_data[1] + '.' + measurement_data[2]) * -1;
          }

          if ((temperature < (sensorData[i].MinTempLimit)) || (temperature > (sensorData[i].MaxTempLimit))) {
            console.log("MinTempLimit :: ", sensorData[i].MinTempLimit);
            console.log("MaxTempLimit :: ", sensorData[i].MaxTempLimit);
            data.temperature_alert = true;
            //telemetryData.alert = true;
          } else {
            data.temperature_alert = false;
            //telemetryData.alert = false;
          }

          if ((humidity < (sensorData[i].MinHumLimit)) || (humidity > (sensorData[i].MaxHumLimit))) {

            console.log("MinHumLimit :: ", sensorData[i].MinHumLimit);
            console.log("MaxHumLimit :: ", sensorData[i].MaxHumLimit);
            data.humidity_alert = true;
            //telemetryData.alert = true;
          } else {
            data.humidity_alert = false;
            //telemetryData.alert = false;
          }

          data.sensorID = sensorData[i].BeaconID;
          data.temperature = temperature;
          data.humidity = humidity;
          scanned_beacons.push(beaconid);
          //console.log("scanned beacons", scanned_beacons);
          telemetryData.count = sensorData.length;

          telemetryData.tempAlert = (data.temperature_alert || data.humidity_alert);
          telemetryData.alert = telemetryData.tempAlert || telemetryData.alert || false;

          telemetryData.sensor_Values.push(data);
          console.log("Scanned Beacons Length", scanned_beacons.length);
          if (sensorData.length == (j + 1)) {
            resolve(telemetryData);
          }
          //console.log("Data ::", telemetryData);
        }

      }

    });

    //console.log("scanned beacons", scanned_beacons);
  }, function(err) {
    reject(err)
    console.log("Error while fetching beacon list", err);
  });
  noble.stopScanning();
}


// const repeatScanDevice = (config) => {
//   let data;
//
//   return new Promise(function(resolve, reject) {
//     return setInterval(() => {
//       data = scanBeaconReadings(config);
//       console.log("Data for send function:::", data);
//       resolve(data);
//     }, 10000);
//   })
// }



module.exports = {
  getGPSDetails: getGPSDetails,
  scanBeaconReadings: scanBeaconReadings
}
