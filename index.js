// Load the TCP Library
net = require('net');
counter = 1;
// Keep track of the chat clients
let clients = {};

const KB1024 = 1024*1024;
const ACCEPTABLE_ENCODING = ['utf8', 'binary', 'ascii', 'utf16le', 'base64', 'latin1', 'hex'];

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
                socket.write('Invalid relay message. Example format: relay 2,3,4 utf8 55,76,46,26');
                return;
            }
            let ids = relay_message[1].split(',').map(val => parseInt(val)).filter(val => !isNaN(val));

            const encoding = relay_message[2]
            
            let body_bytes = relay_message[3].split(',');

            //Converting body to buffer
            const buffer = Buffer.from(body_bytes.map(val => parseInt(val)));

            //Validate
            const output = _validate(ids, buffer, encoding);

            if(output.success) {
                const body = _decode(encoding, buffer);
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

    function _decode(encoding, buffer) {
        return buffer.toString(encoding);
    }

    function _validate(ids, buffer, encoding) {
        if(ids.length > 255) {
            return {
                success: false,
                reason: 'You can send message to 255 clients at once only'
            }
        }        

        if(buffer.length > KB1024) {
            return {
                success: false,
                reason: 'Body can have max 1024 KB of data only'
            }
        }

        if(!ACCEPTABLE_ENCODING.includes(encoding)) {
            return {
                success: false,
                reason: 'Invalid encoding. Acceptable values: ' + ACCEPTABLE_ENCODING.join(' ')
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