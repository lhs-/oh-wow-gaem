
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var sockio = require('socket.io');
var http = require('http');
var path = require('path');
var app = express();

var canvasMatrix = [];
var debug = true;

var ROWS = 80;
var COLUMNS = 80;
// remove header cells
var TOTAL_CELLS = ROWS * COLUMNS - 11 * COLUMNS;

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

populateCanvasMatrix(ROWS, COLUMNS);

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

/* matrix based approach */
// canvas[y][x]
function populateCanvasMatrix(rows, columns) {
    for (var y = 0; y < rows; y++) {
        var emptyRow = [];
        // populate the row with entries of pure hex black
        for (var x = 0; x < columns; x++) {
            emptyRow.push(0);
        }
        canvasMatrix.push(emptyRow);
    }
}

function clearCanvas(rows, columns) {
    canvasMatrix = [];
    populateCanvasMatrix(rows, columns);
}

function setMatrixCell(x, y, team) {
    // canvas[y][x] --> color
    var row = canvasMatrix[y];

    if (row)
        row[x] = team;
    else
        console.log("error setting matrix cell", canvasMatrix.length, "vs", y);
}

function getMatrixCellTeam(x, y) {
    var row = canvasMatrix[y];
    
    if (row)
        return row[x];
    
    console.log("error getting matrix cell", canvasMatrix.length, "vs", y);
    return null;
}

function startGame(){
    game.timerHandle = undefined;
    
    clearCanvas(ROWS, COLUMNS);
    io.sockets.in(netPavilion).emit("clear", { id : 'no-id' });
    
    io.sockets.in(netPavilion).emit('update-percent', {
        team1 : 0,
        team2 : 0
    })

    team1Cells = team2Cells = 0;

    game.ended = undefined; // ended is actually when we started the countdown
    game.starting = Date.now();
    game.started = false;
    game.ended = undefined;
    
    setTimeout(function (){
        game.started = true;
        game.starting = undefined;
        game.restarting = false;
    }, 3 * 650)

    console.log("starting geamu")
    io.sockets.in(netPavilion).emit("start", {})
}

function endGame(){
    game.ended = undefined; // ended is actually when we started the countdown
    game.starting = undefined;
    game.started = false;
    game.ended = undefined;
    game.restarting = true;

    io.sockets.in(netPavilion).emit("end", {
        team1: team1Cells, 
        team2: team2Cells
    });

    io.sockets.in(netPavilion).emit('update-percent', {
        team1 : team1Cells / TOTAL_CELLS,
        team2 : team2Cells / TOTAL_CELLS
    })
    setTimeout(startGame, 10 * 1000)
}

/* happy happy socket.io code */
var io = sockio.listen(server);
var netPavilion = "pavilion";

var team1Cells = 0;
var team2Cells = 0;
var game = {
    timerHandle : undefined,
    team1 : 0,
    team2 : 0,
    started : false
}

io.sockets.on('connection', function (socket) { 
    
    socket.on('disconnect', function (){
        console.log(socket.team, 'disconnected')
        game[socket.team]--;
    })

    socket.on('subscribe', function (data) { 
        log(data.msg);
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

        // send up-to-date info
        socket.emit('update-percent', {
            team1 : team1Cells / TOTAL_CELLS,
            team2 : team2Cells / TOTAL_CELLS
        })

        var wantStart = !game.started && !game.starting && !game.ended && !game.restarting;

        if (wantStart && game.team1 + game.team2 >= 2) {
            game.starting = Date.now();
            io.sockets.in(netPavilion).emit('start', {});
            setTimeout(function (){
                game.started = true;
                game.starting = undefined;
            }, 650 * 3);
        } else if (wantStart && game.team1 + game.team2 < 2) {
            socket.emit('waiting', {});
        } else if (game.starting) {
            socket.emit('start', { started : game.starting });
        } else if (game.timerHandle && game.ended) {
            var ends = game.ended + game.timeout,
                endsIn = ends - Date.now();
            socket.emit('start-timer', { timeout : endsIn })
        } else {
            socket.emit('start', { started : -1 })
        }

        //TODO: optimize later, did the optmizise
        socket.emit('peer connected', {
            response: "hi there!", 
            id: data.id, 
            canvas: JSON.stringify(canvasMatrix)
        }); 
    });

    // should store 0, 1, 2 instead? 0 for neutral, 1 for team1, 2 for team2
    socket.on("draw", function(data) {
        // notify other players
        io.sockets.in(netPavilion).emit("draw", {id: data.id, cell: data.cell, team: data.team, size: data.size});

        // data.cell.x/y, data.size, data.team
        var cellsChanged = 0;
        for (var y = data.cell.y - data.size; y <= data.cell.y + data.size; y++) {
            for (var x = data.cell.x - data.size; x <= data.cell.x + data.size; x++) {
                
                if (x < 0 || y < 0) continue;
                if (y <= 10) continue;
                if (x >= COLUMNS || y >= ROWS) continue;

                var owner = getMatrixCellTeam(x, y);
                if (owner !== data.team) {
                    // remove from previous owner
                    if (owner === 1)
                        team1Cells--;
                    else if (owner === 2)
                        team2Cells--;

                    cellsChanged++;
                    setMatrixCell(x, y, data.team);
                }
            }
        }

        if (data.team === 1) 
            team1Cells += cellsChanged;
        else 
            team2Cells += cellsChanged;

        if (team1Cells + team2Cells >= TOTAL_CELLS * 0.30 && !game.timerHandle) {
            console.log("hello end me now, or later")
            var total = game.team1 + game.team2;
            
            game.timeout = 10;
            game.ended = Date.now();
            if (total < 8) game.timeout = 15;

            game.timeout *= 1000;
            
            game.timerHandle = setTimeout(endGame, game.timeout);
            io.sockets.in(netPavilion).emit('start-timer', {
                timeout : game.timeout
            });
        }

        var t1Percent = team1Cells / TOTAL_CELLS;
        var t2Percent = team2Cells / TOTAL_CELLS;

        io.sockets.in(netPavilion).emit("update-percent", {
            id: "no-id", 
            team1: t1Percent, 
            team2: t2Percent
        });
    });

    socket.on("clear", function(data) {
        team1Cells = team2Cells = 0;

        game.ended = undefined; // ended is actually when we started the countdown
        game.starting = Date.now();
        game.started = false;
        game.ended = undefined;

        setTimeout(function (){
            game.started = true;
            game.starting = undefined;
        }, 3 * 650)
        
        io.sockets.in(netPavilion).emit('update-percent', {
            team1 : 0,
            team2 : 0
        })
        io.sockets.in(netPavilion).emit('start', {});
        io.sockets.in(netPavilion).emit("clear", { id : 'no-id'});
        clearCanvas(ROWS, COLUMNS);
    });
}); 

function log(msg) {
    if (debug) {
        console.log("SRV: " + msg);
    }
}
