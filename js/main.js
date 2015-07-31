var fs = require('fs');
var mosca = require('mosca');
var mqtt = require('mqtt');
var brokerAddr = "localhost:1883";
var mqttClientStatus = false;
var clientConnect;



var client ;
var SerialPort = require("serialport");
var server_status = "stopped";

var port; //Current serial port

var os = require('os');
var ifaces = os.networkInterfaces();



var gui = require('nw.gui');
var win = gui.Window.get();

win.on("close", function(){
	brokerAddr = document.getElementById("bridge-mqtt-broker-addr").value;
	console.log(brokerAddr);
	localStorage.mqttClientAddr = brokerAddr;
	win.close(true);
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
var addr;

document.addEventListener('DOMContentLoaded', function() {
	storedAddr = localStorage.mqttClientAddr;
	console.log("STORED ADDR: ", storedAddr);
	addr = document.getElementById("bridge-mqtt-broker-addr");
	if(storedAddr) {
		brokerAddr = storedAddr;
		addr.value = brokerAddr;
	}
	clientConnect = document.getElementById("clientConnect");
	addr.setAttribute("class", "redBackground");
	console.log("CONN: ", brokerAddr);

	client = mqtt.connect('mqtt://' + brokerAddr);
	
	client.on("connect", function() {
		console.log("connected to server");
		addr.setAttribute("class", "greenBackground");
	});
	client.on("close", function() {
		console.log("connection closed");
		addr.setAttribute("class", "redBackground");
	});
	client.on("message", function(topic, packet) {
		console.log("Message rcvd", topic, packet.toString());
		if (connectStatus == true) {
			port.write(topic + ":" + packet.toString() + "\n", function(err, results) {
				//console.log('err ' + err);
				//console.log('results ' + results);
			});
		}
	});
	clientConnect.addEventListener("click", function(){
		addr = document.getElementById("bridge-mqtt-broker-addr");
		brokerAddr = addr.value;
		addr.setAttribute("class", "redBackground");
		if (client && typeof client.end == 'function') { 
			console.log("Ending current client");
		  client.end(); 
		} else {
			console.log("Client undefined")
		}
		client = mqtt.connect('mqtt://' + brokerAddr);
		client.on("connect", function() {
			console.log("connected to server");
			addr.setAttribute("class", "greenBackground");
		});
	})
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
						//console.log('data received: ' + data);

						parsed_data = data.split("|");

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
				row = document.createElement("tr");
				ip_addr_list.appendChild(row);
				nameTD = document.createElement("td");
				nameTD.setAttribute("class", "interface-name");
				nameTD.innerText = ifname;
				row.appendChild(nameTD);
				addrTD= document.createElement("td");
				addrTD.setAttribute("class", "interface-address");
				addrTD.innerText = iface.address;
				row.appendChild(addrTD);
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
	console.log(ev.toElement.value);
	document.getElementById('current-port').innerText = ev.toElement.value;
	currentPort = ev.toElement.value;
	port = new SerialPort.SerialPort(
		ev.toElement.value, {
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

		});
	});
}



var path = './';
var fs = require('fs');

fs.watch(path, function() {
	if (location)
		location.reload();
});
