/* the palette used for drawing */
var white =     "#ff7b8a";
var darkGray =  "#8c8c8c";

/* the ~styles~ you can draw with on the canvas */
var TEAM_1 = "#ff7b8a";
var TEAM_2 = "#7bfff0";
var currentTeam = 1;
var NEUTRAL = "#232323";

var canvasElement = document.getElementById("canvas");
var context = canvasElement.getContext("2d");
var mouseIsDown = false;
var willDrawSquare = false;

var matrix = [];
var debug = false;

/* for responsive canvas do the following hack */
// // Set canvas dimensions
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

var ROWS = 160,
    COLUMNS = 160;

var cellScale = {
        x: canvasElement.width / COLUMNS, 
        y: canvasElement.height /  ROWS
    },
    cellSize = (cellScale.x + cellScale.y) / 3;

var game = {
    started : false
}

function populateMatrix() {
    for (var i = 0; i < COLUMNS; i++) {
        var emptyRow = [];
        // populate the row with entries of the neutral color
        for (var j = 0; j < ROWS; j++) {
            emptyRow.push(0);
        }
        matrix.push(emptyRow);
    }
}
populateMatrix();

function drawGrid(){
    console.log("drawing grid");

    for (var y = 0; y < ROWS; y++) {
        context.strokeStyle = white;
        context.fillStyle = "#0E0";
        context.fillRect(0, y * cellScale.y, canvas.width, 1);
    }

    for (var x = 0; x < COLUMNS; x++) {
        context.strokeStyle = white;
        context.fillStyle = "#0E0";
        context.fillRect(x * cellScale.x, 0, 1, canvas.height);
    }
}

function assignTeam(team) {
    var team1 = "THE ENEMY";
    var team2 = "YOUR TEAM";
    currentTeam = team;
    console.log('i am team', team);
    if (team === 1) {
        team1 = "YOUR TEAM";
        team2 = "THE ENEMY";
    }
    $(".team1").text(team1);
    $(".team2").text(team2);
}
function updatePercent(team1, team2) {
    
    $("#team1").text(team1.toFixed(1) + "%");
    $("#team2").text(team2.toFixed(1) + "%");

    var oldStyle = context.fillStyle;
    context.fillStyle = TEAM_1;
    context.strokeStyle = TEAM_1;
    var team1Width = (canvasElement.width / 100) * parseInt(team1);
    var team2Width = (canvasElement.width / 100) * parseInt(team2);
    context.fillRect(0, 0, team1Width, 10);
    context.fillStyle = TEAM_2;
    context.strokeStyle = TEAM_2;
    context.fillRect(canvasElement.width - team2Width, 0, team2Width, 10);
    context.fillStyle = oldStyle;
    context.strokeStyle = oldStyle;
}

function setMatrixCell(cell, team, size) {
    for (var i = -size; i <= size; i++) {
        for (var j = -size; j <= size; j++) {
            var y =  Math.floor(cell.y / cellSize) + i;
            // get the row
            var row = matrix[y];
            // set the cell: (cell.x, cell.y) = style
            try {
                var x =  Math.floor(cell.x / cellSize) + j;
                row[x] = team;
            } catch (error) {
                log("error line 33");
            }
        }
   }
}

function getTeamAt(cell) {
    try {
        var row = matrix[cell.y / cellSize];
        return row[cell.x / cellSize];
    } catch (error) {
        log("44: yeah we heard you");
        // lol yolo
    }
}

$(document).ready(function() {
    context.strokeStyle = white;
    context.fillStyle = NEUTRAL;
    context.fillRect(0, 0, canvas.width, canvas.height);
    log("width in cells: " + COLUMNS);
    log("height in cells: " + ROWS);
    //drawGrid();
    $(".team1").css("color", TEAM_1);
    $(".team2").css("color", TEAM_2);
    context.fillStyle = NEUTRAL;
    // draw the slider
    context.fillRect(0, 0, canvasElement.width, 10);
    context.fillStyle = TEAM_1;
});

/*
 *
 * grid 
 * -------------
 * | x x x x x |
 * | x x x x x |
 * | x x x x x |
 * -------------
 * x = black (0), full (1), hollow (2)
 *
 * send (gridX, gridY), type(0|1|2)
 *
 * queue
 *
 *
 */

canvasElement.addEventListener("touchmove", moveEvent);
canvasElement.addEventListener("mousemove", moveEvent);

var prevPos = { x : 0, y : 0 }
function moveEvent(e) {
    var size = 5;
    // if the mouse-btn is down, we draw!!

    if (mouseIsDown) {
        if (!game.started) {
            mouseIsDown = false;
            return;
        }

        var cell = findCellPos(e), pos = findPos(e);
        var dx = prevPos.x - pos.x,
            dy = prevPos.y - pos.y,
            dist = dx*dx + dy*dy;

        // only permit drawing under the ui/header/thing
        if (cell.y >= 11 && dist >= 260) {
            prevPos.x = pos.x;
            prevPos.y = pos.y;
            
            // if the cell already contains that which is to be drawn: 
            // skip drawing it lol
            if (isSameTeamAt(cell, currentTeam)) { 
                return;
            }
            $("#canvas").trigger("draw", { cell: cell, team: currentTeam, size: size});
            drawTeam(pos, currentTeam, size);
        }
    }
}

document.addEventListener("keydown", function(e) {
    if (e.which === 53) {
        clearScreen();
        // stop the mouse from drawing
        mouseIsDown = false;
        $("#canvas").trigger("clear");
    }
});

// draw *a* thing when we first click with the mouse button
canvasElement.addEventListener("mousedown", function(e) {
    if (!game.started) return;
    
    var gridPos = findCellPos(e);
    if (gridPos.y >= 11) {
        var size = 8,
            cell = findPos(e);
        mouseIsDown = true;
        drawTeam(cell, currentTeam, size);
        $("#canvas").trigger("draw", {cell: gridPos, team: currentTeam, size: size});
    }
});

canvasElement.addEventListener("touchstart", function(e) {
    e.preventDefault();
    if (!game.started) return;
    
    var size = 8;
    var gridPos = findCellPos(e);
    if (gridPos.y >= 11) {
        mouseIsDown = true;
        drawTeam(findPos(e), currentTeam, size);
        $("#canvas").trigger("draw", {cell: gridPos, team: currentTeam, size: size});
    }
});

canvasElement.addEventListener("mouseup", function() {
    mouseIsDown = false;
});
canvasElement.addEventListener("touchend", function() {
    mouseIsDown = false;
});

$("#canvas").on("renderCanvas", function(evt, data) {
    for (var i = 0, l = data.events.length; i < l; i++) {
        evt = data.events[i]
        drawCell(evt.cell, evt.team, evt.size);
    }
});

function drawCell(cell, team, size) {
    var pos = {
        x : cell.x * cellScale.x,
        y : cell.y * cellScale.y
    }
    drawTeam(pos, team, size)
}

function drawTeam(cell, team, size) {
    // update the matrix and continue drawing on the canvas
    //setMatrixCell(cell, team, size);
    var oldStyle = context.fillStyle;
    if (team == 0) {
        // context.fillStyle = NEUTRAL;
        // context.strokeStyle = NEUTRAL;
    } else if (team == 1) {
        context.fillStyle = TEAM_1;
        context.strokeStyle = TEAM_1;
    } else if (team == 2) {
        context.fillStyle = TEAM_2;
        context.strokeStyle = TEAM_2;
    } else {
        console.log("SOMETHING BAD HAPPENED IN DRAW TEAM");
    }

    drawCircle(cell, size);
    context.fillStyle = oldStyle;
    context.strokeStyle = oldStyle;
}

function drawCircle(cell, size) {
    // draw it twice so that the circle rim is more opaque
    //for (var i = 0; i < 2; i++) {
        context.beginPath();
        context.arc(cell.x,
                    cell.y, 
                    cellSize * size, 0, 2 * Math.PI, false);
        context.stroke();
        context.fill();
        context.closePath();
    //}
    generateSplats(cell, size);
}

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function generateSplats(cell, size) {
    var offset = 50;
    for (var i = 0; i < 3; i++) {
        var randX = Math.floor(random() * offset) - offset/2;
        var randY = Math.floor(random() * offset) - offset/2;
        var randRadius = 0.4 + 1.5 * random();

        context.beginPath();
        context.arc(cell.x + randX,
                    cell.y + randY, 
                    cellSize * randRadius * size, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
        context.closePath();
    }
}

function clearScreen() {
    var old = context.fillStyle;
    context.fillStyle = NEUTRAL;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = old;
    matrix = [];
    populateMatrix();
}

// find the position on the canvas that was clicked
var offsetLeft = canvasElement.offsetLeft,
    offsetTop = canvasElement.offsetTop
function findPos(e) {
    // worst method ever, wtf is wrong with the world??
    var cell = { x : 0, y : 0 }

    if (e.targetTouches) {
        return {
            x : e.offsetX || e.targetTouches[0].pageX,
            y : e.offsetY || e.targetTouches[0].pageY
        }
    } else if (e.x != undefined && e.y != undefined) {
        cell.x = e.x;
        cell.y = e.y;
    } else {
        cell.x = e.clientX;
        cell.y = e.clientY;
    }

    cell.x -= canvas.offsetLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
    cell.y -= canvas.offsetTop + document.body.scrollTop + document.documentElement.scrollTop;
    return { x : cell.x, y : cell.y }
}

// convert the canvas position from pixel coords to cell coords
function findCellPos(e) {
    var pos = findPos(e);

    return {
        x: Math.floor(pos.x / cellScale.x), 
        y: Math.floor(pos.y / cellScale.y)
    };
}

function isSameTeamAt(cell, type) {
    return getTeamAt(cell) === type;
}

function log(msg) {
    if (debug) {
        console.log(msg);
    }
}

var countdownTimer = {
    el : $("#timer"),
    handle : undefined,
    timeout : undefined,
    tickTock : function() {
        countdownTimer.timeout = countdownTimer.timeout - 100;

        if (countdownTimer.timeout < 0) 
            countdownTimer.timeout = 0;

        countdownTimer.el.text((countdownTimer.timeout / 1000).toFixed(1));
        if (countdownTimer.timeout <= 0) {
            countdownTimer.el.text("xx");
            clearInterval(countdownTimer.handle);
            countdownTimer.handle = countdownTimer.timeout = undefined;
        }
    }
};
function startCountdown(deadline, timeout) {
    countdownTimer.timeout = deadline - Date.now();

    // If we somehow are desync time-wise, use the provided timeout instead
    if (countdownTimer.timeout > timeout)
        countdownTimer.timeout = timeout;

    countdownTimer.el.text((countdownTimer.timeout / 1000).toFixed(1));

    if (!countdownTimer.handle)
        countdownTimer.handle = setInterval(countdownTimer.tickTock, 100);
}


function announceWinner(team1, team2) {
    var winner = team2 > team1 ? 2 : 1;

    if (currentTeam === winner)
        text = "YOUR TEAM WON";
    else
        text = "THE ENEMY WON"

    game.started = false;
    $("#timer").text("xx");
    $("#winnar").show().text(text);
}

function waitGame(){
    game.started = false;
    $("#winnar").show().text("Waiting for players");
}

var gameTimer = {
    handle : undefined,
}
function startGame(deadline, immediate, refTimeout) {
    var arr = ["3", "2", "1", "DRAW!"];

    var timeout = deadline - Date.now()
    if (timeout > refTimeout)
        timeout = refTimeout;

    if (timeout <= 0 || immediate) {
        game.started = true;
        $("#winnar").show().hide();

        if (gameTimer.handle)
            clearInterval(gameTimer.handle);
        gameTimer.handle = undefined;
    }

    gameTimer.handle = setInterval(function() {
        $("#winnar").show().text(text);
        if (arr.length === 0) {
            $("#winnar").hide();
            clearInterval(gameTimer.handle);
        } else {
            var text = arr.splice(0, 1)
            game.started = arr.length === 0;
            $("#winnar").show().text(text);
        }
    }, timeout / arr.length);
}
