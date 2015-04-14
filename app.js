
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var sockio = require('socket.io');
var http = require('http');
var path = require('path');
var app = express();

var canvasMatrix = []; // canvasMatrix[y][x] --> team
var debug = true;

var ROWS = 160,
    COLUMNS = 160,
    // remove header cells
    TOTAL_CELLS = ROWS * COLUMNS - 11 * COLUMNS;

// all environments
app.set('port', '8001');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(require('less-middleware')(path.join(__dirname, 'public') ));

app.use(express.logger('dev'));
app.use(express.json());

app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon(path.join(__dirname, "public/icon.ico")));
app.use(app.router);

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get("/", routes.index);

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
    populateCanvasMatrix(ROWS, COLUMNS);
});

/* matrix based approach */
function populateCanvasMatrix() {
    canvasMatrix = new Array(ROWS);
    for (var y = 0; y < ROWS; y++) {
        var emptyRow = new Array(COLUMNS);
        // populate the row with entries of pure hex black
        for (var x = 0; x < COLUMNS; x++) {
            emptyRow.push(0);
        }
        canvasMatrix[y] = emptyRow;
    }
}

/* clear the canvas */
function clearCanvas() {
    for (var y = 0; y < ROWS; y++)
        for (var x = 0; x < COLUMNS; x++)
            canvasMatrix[y][x] = 0;
}

function checkValidCell(x, y) {
    if (x >= COLUMNS || y >= ROWS || y < 0 || x < 0)
        return false;

    return y >= 11;
}

/* happy happy socket.io code */
var io = sockio.listen(server);
var netPavilion = "pavilion";

function emitAll(msg, obj) {
    io.sockets.in(netPavilion).emit(msg, obj);
}
function activateState(state) {
    console.log('switching from', game.state.name, 'to', state.name)
    game.state.deactivate();
    game.state = state;
    state.activate();
}

// States -- this is actually the core game logic
var WAITING = {
        name : 'WAITING',
        initClient : function (client){
            // Did this client move us past the threshold?
            if (WAITING.wantStart())
                activateState(STARTING);
            else {
                client.emit('waiting', {});
                client.emit('update-percent', { team1 : 0, team2 : 0 })
            }
        },
        deinitClient : function (client) { /* team deregistration has already been done */ },
        activate : function (){
            if (WAITING.wantStart())
                activateState(STARTING);
            else
                emitAll('waiting')
        },
        deactivate : function () {},
        wantStart : function (){
            return game.team1 + game.team2 >= 2;
        }
    },
    STARTING = {
        name : 'STARTING',
        deadline : undefined,
        timer : undefined,
        initClient : function (client){
            // Allow players connecting during countdown to start simultaneously
            client.emit('start', { 
                deadline : STARTING.deadline,
                timeout : STARTING.deadline - Date.now()
            });
            client.emit('update-percent', { team1 : 0, team2 : 0 });
            client.emit('clear', {});
        },
        deinitClient : function (client) {
            // Do we want to transition back?
            if (!WAITING.wantStart()) {
                activateState(WAITING);
                clearTimeout(STARTING.timer);
            }
        },
        activate : function () {
            // 3/2/1 each show up for 650ms, DRAW is when players may start drawing
            STARTING.deadline = Date.now() + 3 * 650;
            
            clearCanvas();
            emitAll('clear', {});
            game.drawEvents = [];

            STARTING.timer = setTimeout(function () {
                activateState(PLAYING);
            }, 3 * 650)
            emitAll('start', { 
                deadline : STARTING.deadline,
                timeout : 3 * 650
            });
            emitAll('update-percent', { team1 : 0, team2 : 0 });
        },
        deactivate : function () { 
            if (STARTING.timer)
                clearTimeout(STARTING.timer)
            STARTING.timer = STARTING.deadline = undefined;
        }
    },
    PLAYING = {
        name : 'PLAYING',
        team1Cells : 0,
        team2Cells : 0,

        deadline : undefined,
        timer : undefined,

        initClient : function (client) {
            client.emit('start', { immediately : true })
            client.emit('update-percent', { 
                team1 : PLAYING.team1Cells / TOTAL_CELLS, 
                team2 : PLAYING.team2Cells / TOTAL_CELLS
            });
            client.emit('render-canvas', { events: game.drawEvents })
            if (PLAYING.deadline)
                client.emit('start-timer', { 
                    deadline : PLAYING.deadline,
                    timemout : PLAYING.deadline - Date.now()
                })
        },
        deinitClient : function (client) { /* rebalance teams? */ },
        activate : function (){
             PLAYING.team1Cells = PLAYING.team2Cells = 0;
            //clearCanvas();
            emitAll('start', { immediately : true })
            PLAYING.timer = PLAYING.deadline = undefined;
        },
        update : function (team, cells) {
            if (team === 1) 
                PLAYING.team1Cells += cells;
            else 
                PLAYING.team2Cells += cells;

            emitAll("update-percent", {
                team1: PLAYING.team1Cells / TOTAL_CELLS, 
                team2: PLAYING.team2Cells / TOTAL_CELLS
            });

            var accum = PLAYING.team1Cells + PLAYING.team2Cells
            if (accum > TOTAL_CELLS * 0.3 && !PLAYING.deadline) {
                // 15 sec if few, 10 sec if many. 
                var timeout = (game.team1 + game.team2) < 8 ? 15 : 10;
                timeout *= 1000;

                PLAYING.deadline = Date.now() + timeout;

                // Emit both deadline and timeout, allowing client to figure out the rest
                emitAll('start-timer', { 
                    deadline : PLAYING.deadline,
                    timemout : timeout 
                })

                PLAYING.timer = setTimeout(function (){
                    var team1 = PLAYING.team1Cells / TOTAL_CELLS, 
                        team2 = PLAYING.team2Cells / TOTAL_CELLS;

                    emitAll('end', { team1 : team1, team2 : team2 })
                    emitAll('update-percent', { team1 : team1, team2 : team2 })
                    activateState(RESTARTING);
                }, timeout);
            }
        },
        deactivate : function () { 
            if (PLAYING.timer)
                clearTimeout(PLAYING.timer)
            PLAYING.timer = PLAYING.deadline = undefined;
        }
    },
    RESTARTING = {
        name : 'RESTARTING',
        deadline : undefined,
        timer : undefined,
        initClient : function (client){
            var team1 = PLAYING.team1Cells / TOTAL_CELLS, 
                team2 = PLAYING.team2Cells / TOTAL_CELLS;

            client.emit('render-canvas', { canvas: game.drawEvents });
            client.emit('start-timer', { 
                deadline : RESTARTING.deadline,
                timeout : RESTARTING.deadline - Date.now()
            });
            client.emit('end', { team1 : team1, team2 : team2 });
            client.emit('update-percent', { team1 : team1, team2 : team2 });
        },
        deinitClient : function (client) {
            // If we lost enough players that we cannot actually start next round
            // switch directly to waiting state.
            if (!WAITING.wantStart())
                activateState(WAITING);
        },
        activate : function (){
            var timeout = 10 * 1000;
            RESTARTING.deadline = Date.now() + timeout;
            emitAll('start-timer', { 
                deadline : RESTARTING.deadline,
                timeout : timeout
            });
            RESTARTING.timer = setTimeout(function (){
                activateState(WAITING);
            }, timeout);
        },
        deactivate : function () { 
            if (RESTARTING.timer)
                clearTimeout(RESTARTING.timer)
            RESTARTING.timer = RESTARTING.deadline = undefined;
        }
    }

var game = {
    team1 : 0,
    team2 : 0,
    state : WAITING,
    drawEvents : []
}

io.sockets.on('connection', function (socket) { 
    
    socket.on('disconnect', function (){
        
        game[socket.team]--;
        game.state.deinitClient(socket);
        console.log(socket.id, 'disconnected', game.team1 + game.team2, 'players remaining')
    })

    socket.on('subscribe', function () { 
        socket.join(netPavilion);

        // assign new player into team with fewest players
        if (game.team1 > game.team2) {
            game.team2++;
            socket.team = "team2";
            socket.emit('set-team', { team : 2 } );
        } else {
            game.team1++;
            socket.team = "team1";
            socket.emit('set-team', { team : 1 });
        }

        console.log(socket.id, 'connected to team', socket.team, '(total =', (game.team1 + game.team2) + ')')

        // run state initialization
        game.state.initClient(socket);
    });

    // should store 0, 1, 2 instead? 0 for neutral, 1 for team1, 2 for team2
    socket.on("draw", function(data) {
        // If client somehow can draw despite game not started, ignore it
        if (game.state !== PLAYING) 
            return;

        // data.cell.x/y, data.size, data.team -- figure out which cells that must be updated
        var cellsChanged = 0, owner = 0, y, x;
        for (y = data.cell.y - data.size; y <= data.cell.y + data.size; y++) {
            if (y <= 10) continue; // don't even try
            
            for (x = data.cell.x - data.size; x <= data.cell.x + data.size; x++) {
                if (!checkValidCell(x, y)) continue;

                // We know the x,y cell is valid due to checkValidCell so skip safety check
                owner = canvasMatrix[y][x];
                if (owner !== data.team) {
                    // remove from previous owner
                    // we don't need to update anything because team1Cells+team2Cells is constant
                    if (owner === 1)
                        PLAYING.team1Cells--;
                    else if (owner === 2)
                        PLAYING.team2Cells--;

                    cellsChanged++;
                    canvasMatrix[y][x] = data.team;
                }
            }
        }

        // If we didn't change any cells, then don't bother updating
        if (cellsChanged === 0)
            return;

        game.state.update(data.team, cellsChanged)

        // Only store minimum of data. Discard who-sent-id
        game.drawEvents.push({
            cell : data.cell,
            team : data.team,
            size : data.size
        });

        // Notify other players of the event
        io.sockets.in(netPavilion).emit("draw", data); 
    });

    socket.on("clear", function(data) {
        activateState(STARTING);
    });
}); 

function log(msg) {
    if (debug) {
        console.log("SRV: " + msg);
    }
}
