// Load the TCP Library
net = require('net');
counter = 1;
// Keep track of the chat clients
let clients = {};

const KB1024 = 1024*1024;

// Start a TCP Server
net.createServer(function (socket) {

    // Identify this client
    socket.id = counter++;

    //Change encoding from byte array to utf8
    socket = socket.setEncoding('utf8');

    // Put this new client in the list
    clients[socket.id] = socket;

    // Send a nice welcome message and announce
    socket.write("Welcome " + socket.id + "\n");

    // Handle incoming messages from clients.
    socket.on('data', function (data) {

        // Sanitize input string
        data = data.trim();

        if(data == 'identity') {
            socket.write('ID: ' + socket.id);
        }

        if(data == 'list') {
            
            // Get list of all clients except the currently connected client
            let connected_clients = Object.values(clients).map(client => client.id).filter(client => client != socket.id);

            if(connected_clients.length > 0) {
                socket.write('Connected Clients: ' + connected_clients.join(' '));
            } else {
                socket.write('No other client connected');
            }
        }

        //Relay message
        if(data.startsWith('relay')) {

            let relay_message = data.split(' ');
            if(relay_message.length < 3) {
                socket.write('Invalid relay message. Example format: relay 2,3,4 thisisateststring');
                return;
            }
            let ids = relay_message[1].split(',').map(val => parseInt(val)).filter(val => !isNaN(val));
            let body = relay_message[2];

            //Validate
            output = _validate(ids, body);

            if(output.success) {
                _relay(ids, body); //send relay
                socket.write('Relay message sent successfully');
            } else {
                socket.write(output.reason);
            }
        }
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        delete clients[socket.id];
    });

    function _validate(ids, body) {
        if(ids.length > 255) {
            return {
                success: false,
                reason: 'You can send message to 255 clients at once only'
            }
        }
        if(body.length > KB1024) {
            return {
                success: false,
                reason: 'Body can have max 1024 KB of data only'
            }
        }
        return {
            success: true
        }
    }

    function _relay(id_list, body) {
        id_list.forEach(function(id) {
            if(clients[id]) {
                clients[id].write(body);
            }
        })
    }

}).listen(5000);

// Put a friendly message on the terminal of the server.
console.log("Chat server running at port 5000\n");