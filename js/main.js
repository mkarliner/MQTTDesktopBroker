var fs = require('fs');
var mosca = require('mosca');
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:1883');
var SerialPort = require("serialport");
var server_status = "stopped";

var os = require('os');
var ifaces = os.networkInterfaces();

client.on("connect", function() {
	console.log("connected to server");
});

client.on("message", function(topic, packet) {
	console.log("Message rcvd", topic, packet.toString());
	if (connectStatus == true) {
		port.write(topic + ":" + packet.toString() + "\n", function(err, results) {
			console.log('err ' + err);
			console.log('results ' + results);
		});
	}
});

// fs.readFile('./package.json', 'utf-8', function (error, contents) {
// 	document.write(contents);
// });


var ascoltatore = {
	//using ascoltatore
	type: 'mongo',
	url: 'mongodb://localhost:3001/mqtt',
	pubsubCollection: 'ascoltatori',
	mongo: {}
};

var nullBroker = {};

var moscaSettings = {
	port: 1883,
	backend: nullBroker,
	// persistence: {
	// 	factory: mosca.persistence.Mongo,
	// 	url: 'mongodb://localhost:3001/mqtt'
	// },
	http: {
		port: 9001,
		bundle: true,
		static: './'
	}
};

// console.log("Boo = ", localStorage.test);
// localStorage.test = "Boo!";



var currentPort;
var port;
var server;
var connect_button;
var connectStatus = false;
var mqtt_port;
var mqqt_ws_port;

document.addEventListener('DOMContentLoaded', function() {
	start_button = document.getElementById("mqtt-start");
	mqtt_port = document.getElementById("mqtt-port");
	mqtt_ws_port = document.getElementById("mqtt-ws-port");
	mqtt_port.value = moscaSettings.port;
	mqtt_ws_port.value = moscaSettings.http.port;
	// server = new mosca.Server(moscaSettings);
	// server.on('ready', setup);
	start_button.addEventListener("click", function() {
		if (server_status == "stopped") {
			server = new mosca.Server(moscaSettings);
			server.on('ready', setup);
		} else {
			server.close();
			start_button.innerText = "Start MQTT Broker";
			server_status = "stopped";
		}
	}, true);

	connect_button = document.getElementById("connect-serial");
	connect_button.addEventListener("click", function() {
		if (connectStatus == false) {
			port.open(function(error) {
				if (error) {
					console.log('failed to open: ' + error);
				} else {
					console.log('open');
					connect_button.innerText = "Disconnect";
					connectStatus = true;
					port.on('data', function(data) {
						console.log('data received: ' + data);

						parsed_data = data.split(":");

						if (parsed_data[0] == "publish") {
							msg = parsed_data[2].substring(0, parsed_data[2].length - 1);
							client.publish(parsed_data[1], msg, function(p) {
								//console.log("Sent Sir!");
							});
						}
						if (parsed_data[0] == "subscribe") {
							topic = parsed_data[1].substring(0, parsed_data[1].length - 1);
							console.log("subscribing to " + topic);
							client.subscribe(topic, function(p) {
								console.log("SUBSCRIBED");
							});
						}


					});

				}
			});
		} else {
			console.log("Closing");
			port.close(function(error) {
				console.log("Close error", error);
				connectStatus = false;
				connect_button.innerText = "Connect";
			});
		}
	}, true);

	ip_addr_list = mqtt_port = document.getElementById("ip-addr-container");
	Object.keys(ifaces).forEach(function(ifname) {
		var alias = 0;
		ifaces[ifname].forEach(function(iface) {
			if ('IPv4' !== iface.family || iface.internal !== false) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				console.log(ifname + ':' + alias, iface.address);
			} else {
				// this interface has only one ipv4 adress
				console.log(ifname, iface.address);
				nameDiv = document.createElement("div");
				nameDiv.setAttribute("class", "interface-name");
				nameDiv.innerText = ifname;
				ip_addr_list.appendChild(nameDiv);
				addrDiv = document.createElement("div");
				addrDiv.setAttribute("class", "interface-address");
				addrDiv.innerText = iface.address;
				ip_addr_list.appendChild(addrDiv);
			}
		});
	});

	serialPortList();

}, false);



// fired when the mqtt server is ready 

function setup() {
	console.log('Mosca server is up and running');
	document.getElementById('mqtt-status').innerText = "Running";
	start_button.innerText = "Stop MQTT Broker";
	server_status = "running";
}


function portlistener(ev, par) {
	console.log(ev, par);
	console.log(ev.toElement.name);
	document.getElementById('current-port').innerText = ev.toElement.value;
	currentPort = ev.toElement.name;
	port = new SerialPort.SerialPort(
		ev.toElement.name, {
			parser: SerialPort.parsers.readline("\n"),
			baudrate: 9600
		}, false); // this is the openImmediately flag [default is true]
}


function serialPortList() {
	SerialPort.list(function(err, ports) {
		portlist = document.getElementById("serialports");
		ports.forEach(function(port) {
			radio = document.createElement("input");
			label = document.createElement("label");
			label.appendChild(document.createTextNode(port.comName));
			radio.type = "radio"
			radio.name = 'radio';
			radio.value = port.comName;
			radio.addEventListener("click", portlistener, true);
			portlist.appendChild(radio);
			portlist.appendChild(label);
			//document.write(port.comName);
			console.log(port.comName);
			console.log(port.pnpId);
			console.log(port.manufacturer);
		});
	});
}



var path = './';
var fs = require('fs');

fs.watch(path, function() {
	if (location)
		location.reload();
});
