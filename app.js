
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var sockio = require('socket.io');
//var redis = require("redis");
//var client = redis.createClient();
var http = require('http');
var path = require('path');
var app = express();

var canvasMatrix = [];
var debug = true;
var ROWS = 80;
var COLUMNS = 80;

var team1Percent = 0;
var team2Percent = 0;

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
app.get("/clear", function(req, res) {
    clearCanvas(ROWS, COLUMNS);
    log("cleared canvas!");
    res.redirect("/");
});

populateCanvasMatrix(ROWS, COLUMNS);
//restoreCanvasFromRedis();

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});


/* redis code */
function backupCanvasMatrix() {
    // backup the canvas matrix in the db
    client.set("canvas", JSON.stringify(canvasMatrix), function(err, reply) {
        if (err) {
            log("OMG ERR!");
        } else {
            log("I DONE BACKED UP THE MATRIX FOR Y'ALL!");
        }
    });
}

// backup the matrix every minute
//setInterval(backupCanvasMatrix, 60000);


function restoreCanvasFromRedis() {
    client.exists("canvas", function(err, exists) {
        if (exists) {
            client.get("canvas", function(err, canvas) {
                if (err) {
                    log("ERROR: getting canvas");
                } else {
                    canvasMatrix = JSON.parse(canvas);
                }
            });
        };
    })
}

/* matrix based approach */
function populateCanvasMatrix(rows, columns) {
    for (var i = 0; i < rows; i++) {
        var emptyRow = [];
        // populate the row with entries of pure hex black
        for (var j = 0; j < columns; j++) {
            emptyRow.push(0);
        }
        canvasMatrix.push(emptyRow);
    }
}

function clearCanvas(rows, columns) {
    canvasMatrix = [];
    populateCanvasMatrix(rows, columns);
    //backupCanvasMatrix();
}

function setMatrixCell(cell, team) {
    // canvas[y][x] --> color
    // get the row
    var row = canvasMatrix[cell.y];
    // set the cell: (cell.x, cell.y) = team
    try {
        row[cell.x] = team;
    } catch (error) {
        console.log("error setting matrix cell", canvasMatrix.length, "vs", cell.y);
    }
}

function getMatrixCellTeam(cell) {
    // get the row
    var row = canvasMatrix[cell.y];
    // set the cell: (cell.x, cell.y) = team
    try {
        return row[cell.x];
    } catch (error) {
        console.log("error getting matrix cell", canvasMatrix.length, "vs", cell.y);
        return null;
    }
}

/* happy happy socket.io code */
var io = sockio.listen(server);
var socket;
var netPavilion = "pavilion";
io.sockets.on('connection', function (sock) { 
    socket = sock;
    socket.on('subscribe', function (data) { 
        log(data.msg);
        socket.join(netPavilion);
            io.sockets.in(netPavilion).emit('peer connected', 
                {response: "hi there!", id: data.id, canvas: JSON.stringify(canvasMatrix)}); 

            io.sockets.in(netPavilion).emit('timer-start', 
                {id: "no-id", timeout: 30000}); 
        // getCanvas(function(canvas) {
        //     io.sockets.in(netPavilion).emit('peer connected', 
        //         {response: "hi there!", id: data.id, canvas: canvas}); 
        // });
    });

    // should store 0, 1, 2 instead? 0 for neutral, 1 for team1, 2 for team2
    socket.on("draw", function(data) {
        log("received draw call from " + data.id);
        log("rec draw style: " + data.team);
        io.sockets.in(netPavilion).emit("draw", {id: data.id, cell: data.cell, team: data.team, size: data.size});

        var oldTeam = getMatrixCellTeam(data.cell, data.size);
        if (oldTeam) {
            // painting over other team's cell
            if (oldTeam !== data.team) {
                if (data.team == 1) {
                    team1Percent++;
                    team2Percent--;
                } else if (data.team == 2) {
                    team2Percent++;
                    team1Percent--;
                } else if (oldTeam == 0 && data.team == 1) {
                    team1Percent++;
                } else if (oldTeam == 0 && data.team == 2) {
                    team2Percent++;
                }
                console.log("wow rude, you rekt that color :<");
            }
        } else {
            console.log("no old team");
            if (data.team == 1){ 
                    team1Percent++;
            } else if (data.team == 2) {
                    team2Percent++;
            }
        }
        var t1Percent = team1Percent / ROWS * COLUMNS;
        console.log("team 1 percent is:", t1Percent);
        var t2Percent = team2Percent / ROWS * COLUMNS;
        io.sockets.in(netPavilion).emit("update-percent", {id: "no-id", team1: t1Percent, team2: t2Percent});
        setMatrixCell(data.cell, data.team);
    });

    socket.on("clear", function(data) {
        log("clear issued from: " + data.id);
        teamPercent1 = 0;
        teamPercent2 = 0;
        io.sockets.in(netPavilion).emit("clear", {id: data.id});
        clearCanvas(ROWS, COLUMNS);
    });
}); 

function log(msg) {
    if (debug) {
        console.log("SRV: " + msg);
    }
}
