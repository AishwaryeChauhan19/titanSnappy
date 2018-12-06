/*
 * Created by suman.sharma on 26/10/2018
 */
const macaddress = require('macaddress');
const request = require('request');
const config = require('./config');
'use strict';

//Function to fetch the mac address of the device
const getMacAddress = () => {
  let macId;

  return new Promise(function(resolve, reject) {
    macaddress.one(function(err, mac) {
      if (err) {
        reject(err);
      } else {
        macId = mac.toLowerCase().replace(new RegExp(':', 'g'), '');
        resolve(macId);
      }
    });
  })
}

//Function to fetch the connectionString with respect to the gateway
const getConnectionString = (macId) => {
  let connectionString;
  let sharedAccessKey;
  let azureIoTString;
  let url = config.azureFunction.connectionString + macId;

  return new Promise(function(resolve, reject) {
    request.get({
      url: url
    }, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        connectionString = JSON.parse(JSON.parse(body))
        sharedAccessKey = ";SharedAccessKey=" + connectionString;
        azureIoTString = config.azureFunction.connStringPrefix + macId + sharedAccessKey;
        //console.log(azureIoTString);
        resolve(azureIoTString);
      }
    })
  })
}

//Function to fetch the beacons associated with the gateway
const fetchBeaconAssociation = (macId) => {

  let beaconData = [];
  let url = config.azureFunction.gateway_beacon_data + "'" + macId + "'";

  return new Promise(function(resolve, reject) {
    request.get({
      url: url
    }, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        // data = JSON.parse(JSON.parse(body))
        resolve(body);
      }
    })
  })
}

const getGPSFromAnotherDevice = () => {

  let url = config.azureFunction.gpsAzureFunctionUrl;

  return new Promise(function(resolve, reject) {
    request.get({
      url: url
    }, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        // data = JSON.parse(JSON.parse(body))
        resolve(body);
      }
    })
  })
}


module.exports = {
  getMacAddress: getMacAddress,
  getConnectionString: getConnectionString,
  fetchBeaconAssociation: fetchBeaconAssociation,
  getGPSFromAnotherDevice: getGPSFromAnotherDevice
};