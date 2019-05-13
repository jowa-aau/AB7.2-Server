"use strict";


// Serverport
var port = 5555;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');


// list of currently connected clients (users)
var clients = [];
var history = [];


/**
 *  create a HTTP server
 */
var server = http.createServer(function (request, response) {
    console.log((new Date()) + "[SERVER] request: " + request);
    response.write(request);
    response.end();
});

server.listen(port, function () {
    console.log((new Date()) + "[SERVER] Server is listening on port "
        + port);
});


/**
 * WebSocket server
 */
var websocketServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server.
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
websocketServer.on('request', function (request) {
    console.log((new Date()) + ' [Server]: new client connected (' + request.origin + ')');

    // accept webSocketConnection - you should check 'request.origin' to
    // make sure that client is connecting from your website
    var webSocketConnection = request.accept(null, request.origin);

    // we need to know client index to remove them on 'close' event
    clients.push(webSocketConnection);
    var index = clients.length - 1;

    var userName = false;

    console.log((new Date()) + ' [Server]: Connection accepted.');

    // user sent some message
    webSocketConnection.on('message', function (message) {
        console.log(new Date() + ' [Server]: received message: ' + JSON.stringify(message));

        if (message.type === 'utf8') { // accept only text
            // first message sent by user is their name
            if (userName === false) {

                userName = message.utf8Data;
                var userList = getUserList();
                var response = JSON.stringify({
                    type: 'status', data: {
                        'accepted': true,
                        'userName': userName,
                        'userList': userList
                    }
                });

                console.log((new Date()) + ' [Server]: send : ' + response);
                webSocketConnection.sendUTF(response);

                var clientJoined = {
                    type: 'newClient',
                    data: {
                        'id': index,
                        'userName': userName
                    }
                };

                clients[index].userData = clientJoined.data;

                sendToAll(JSON.stringify(clientJoined));


            } else {
                console.log((new Date()) + ' [Server]: Received Message from '
                    + userName + ': ' + message.utf8Data);

                var obj = {
                    time: (new Date()).getTime(),
                    text: message.utf8Data,
                    author: userName
                };

                history.push(obj);
                history = history.slice(-100);

                // send msg to all clients
                var json = JSON.stringify({type: 'message', data: obj});
                sendToAll(json);
            }
        }
    });


    // user disconnected
    webSocketConnection.on('close', function (connection) {
            if (userName !== false && clients[index].userData != null) {

                var removeUser = {
                    type: 'removeUser', data: {
                        'user': clients[index].userData
                    }
                }

                // remove user from the list of connected clients
                clients.splice(index, 1);
                sendToAll(JSON.stringify(removeUser));
            }
        }
    );
});

// send Data to all clients
function sendToAll(json) {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] && clients[i] != null) {
            try {
                clients[i].sendUTF(json);
            } catch (e) {
                console.error(e);
            }
        } else {
            console.error("cannot find client");
        }
    }

}

// get current user list
function getUserList() {
    var data = [];
    for (let i = 0; i < clients.length; i++) {
        if (clients[i].userData) {
            data.push(clients[i].userData);
        }
    }
    return data;
}
