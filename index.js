const fs = require("fs").promises;
const { Reader } = require("@maxmind/geoip2-node");
const DeviceDetector = require("device-detector-js");

const fileName = "gobankingrates.com.access.short.log"; // change your file here

const runIt = async () => {
  const arr = await getFileInfo(fileName);
  if (!arr) {
    return "error occured during read file";
  }
  const cleanerLogs = await updateTheLogs(arr);
  await makeCSV(cleanerLogs);
};

const getFileInfo = async (file) => {
  try {
    const data = await fs.readFile(file, "utf8");
    const arr = data.split(/\r?\n|\r|\n/g);
    return arr;
  } catch (error) {
    console.log(error);
  }
};

const getLocationInfo = async (ip) => {
  const reader = await Reader.open("GeoLite2-City.mmdb");
  const response = await reader.city(ip);
  return response;
};

const updateTheLogs = async (arr) => {
  const result = [];
  const deviceDetector = new DeviceDetector();
  for (let i = 0; i < arr.length; i++) {
    const oneLog = arr[i];
    const logInfo = {};
    logInfo.log = oneLog;

    try {
      const spaceSplit = oneLog.split(" ");
      const iPAddress = spaceSplit[0].trim(); // location is in the first index it seems; if I had more freetime; id probably use a regex to handle all the scnarios instead of splitting by space or double quotes
      const geoLocation = await getLocationInfo(iPAddress);

      if (
        geoLocation.country &&
        geoLocation.country.names &&
        geoLocation.country.names.en
      ) {
        logInfo.country = geoLocation.country.names.en;
      } else {
        logInfo.country = "Unknown";
      }
      if (
        geoLocation.subdivisions &&
        geoLocation.subdivisions[0] &&
        geoLocation.subdivisions[0].names &&
        geoLocation.subdivisions[0].names.en
      ) {
        logInfo.state = geoLocation.subdivisions[0].names.en;
      } else {
        logInfo.state = "Unknown";
      }
    } catch (error) {
      console.log(error);
    }

    try {
      const quoteSplit = oneLog.split(`"`);
      const userInfo = deviceDetector.parse(quoteSplit[5]);

      if (userInfo.device && userInfo.device.type) {
        logInfo.device = userInfo.device.type;
      } else {
        logInfo.device = "Unknown";
      }

      if (userInfo.client && userInfo.client.name) {
        logInfo.browser = userInfo.client.name;
      } else {
        logInfo.browser = "Unknown";
      }
    } catch (error) {
      console.log(error);
    }
    result.push(logInfo);
  }
  return result;
};

const makeCSV = async (cleanerLogs) => {
  try {
    const headerCSV = ["country", "state", "device", "browser"];
    const convertCSV = [
      headerCSV,
      ...cleanerLogs.map((log) => [
        log.country,
        log.state,
        log.device,
        log.browser,
      ]),
    ]
      .map((el) => el.join(","))
      .join("\n");
    const output = await fs.writeFile("output.csv", convertCSV);
    console.log("DONE!");
    return output;
  } catch (error) {
    console.log(error);
  }
};

runIt();
