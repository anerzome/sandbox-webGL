const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = [];

wss.on('connection', (ws) => {
    console.log('Player connected');
    
    ws.on('message', (message) => {
        const playerData = JSON.parse(message);
        if (playerData.type === 'update') {
            const playerIndex = players.findIndex(player => player.id === ws);
            if (playerIndex >= 0) {
                players[playerIndex].position = playerData.position;
                players[playerIndex].rotation = playerData.rotation;
            } else {
                players.push({
                    id: ws,
                    position: playerData.position,
                    rotation: playerData.rotation
                });
            }
            broadcast(JSON.stringify({
                type: 'update',
                players: players.filter(player => player.id !== ws)
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('Player disconnected');
        players = players.filter(player => player.id !== ws);
    });
});

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

console.log('WebSocket server running on ws://localhost:8080');
