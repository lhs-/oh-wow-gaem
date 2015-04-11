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

var ROWS = 80;
var COLUMNS = 80;

var cellScale = {x: canvasElement.width / COLUMNS, y: canvasElement.height /  ROWS};
var cellSize = (cellScale.x + cellScale.y) / 2;

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
    currentTeam = 2;
    if (team === 1) {
        team1 = "YOUR TEAM";
        team2 = "THE ENEMY";
        currentTeam = 1;
    }
    $(".team1").text(team1);
    $(".team2").text(team2);
}
function updatePercent(team1, team2) {
    $("#team1").text(toFixed(team1, 1) + "%");
    $("#team2").text(toFixed(team2, 1) + "%");
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

var lineMode = {
    enabled: false,
    xAxisLocked: false,
    yAxisLocked: false,
    cell: {x: -1, y: -1}
}
var squareMode = {
    enabled: false,
    hasStart: false,
    start: {x: -1, y: -1},
    end: {x: -1, y: -1}
}

$(document).ready(function() {
    context.strokeStyle = white;
    context.fillStyle = NEUTRAL;
    context.fillRect(0, 0, canvas.width, canvas.height);
    log("width in cells: " + COLUMNS);
    log("height in cells: " + ROWS);
    // drawGrid();
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

function moveEvent(e) {
    var size = 4;
    // if the mouse-btn is down, we draw!!
    if (mouseIsDown) {
        var cell = findCellPos(e), pos = findPos(e);
        // only permit drawing under the ui/header/thing
        if (cell.y >= 11) {
            // if the cell already contains that which is to be drawn: 
            // skip drawing it lol
            if (isSameTeamAt(cell, currentTeam)) { 
                return;
            }
            $("#canvas").trigger("draw", { cell: cell, team: currentTeam, size: size});
            drawTeam(pos, currentTeam, 0);
        }
    }
}

document.addEventListener("keyup", function(e) {
    // 16: shift key up == disable line mode
    if (e.which === 16) { 
        lineMode.enabled = false;
        lineMode.yAxisLocked = false;
        lineMode.xAxisLocked = false;
        // lineMode.cell.x = -1;
        // lineMode.cell.y = -1;
        log("line mode disabled");
    }
    // 17: ctrl key up == disable square mode
    else if (e.which === 17) { 
        // squareMode.enabled = false;
        // squareMode.hasStart = false;
        // log("square mode disabled");
    }
});

document.addEventListener("keydown", function(e) {
    // shift key == enable line mode (only draw straight lines)
    if (e.which === 16 && !lineMode.enabled) { 
        lineMode.enabled = true;
    }
    // ctrl key === circle-filled-square mode
    // else if (e.which === 17 && !squareMode.enabled) {
    //     log("square mode enabled");
    //     squareMode.enabled = true;
    // }
    
    // 1 == the black eraser
    else if (e.which === 49) {
        context.fillStyle = NEUTRAL;
        willDrawSquare = true;
        // 2 == hollow circles
    } else if (e.which === 50) {
        context.fillStyle = TEAM_2;
        context.strokeStyle = TEAM_2;
        currentTeam = 2;
        willDrawSquare = false;
        // 3 == full circles
    } else if (e.which === 51) {
        context.fillStyle = TEAM_1;
        context.strokeStyle = TEAM_1;
        currentTeam = 1;
        willDrawSquare = false;
        // 5 == clear the canvas
    } else if (e.which ===53) {
        clearScreen();
        // stop the mouse from drawing
        mouseIsDown = false;
        $("#canvas").trigger("clear");
    }
});

// draw *a* thing when we first click with the mouse button
canvasElement.addEventListener("mousedown", function(e) {
    var cell = findPos(e);
    var gridPos = findCellPos(e);
    if (gridPos.y >= 11) {
        var size = 5;
        mouseIsDown = true;
        drawTeam(cell, currentTeam, 1);
        $("#canvas").trigger("draw", {cell: gridPos, team: currentTeam, size: size});
        lineMode.cell = cell; 
    }
});

canvasElement.addEventListener("touchstart", function(e) {
    e.preventDefault();
    var size = 5;
    var gridPos = findCellPos(e);
    if (gridPos.y >= 11) {
        canvas_x = e.targetTouches[0].pageX;
        canvas_y = e.targetTouches[0].pageY;
        var cell = findPos(e);
        mouseIsDown = true;
        drawTeam(cell, currentTeam, 1);
        $("#canvas").trigger("draw", {cell: gridPos, team: currentTeam, size: size});
        lineMode.cell = cell; 
    }
});

canvasElement.addEventListener("mouseup", function() {
    mouseIsDown = false;
    lineMode.xAxisLocked = false;
    lineMode.yAxisLocked = false;
});

$("#canvas").on("renderCanvas", function(evt, data) {
    matrix = data.canvas;
    for (var x = 0; x < COLUMNS; x++) {
        for (var y = 0; y < ROWS; y++) {
            var cellPos = {x: x * cellScale.x, y: y * cellScale.y};
            if (data.canvas[x][y] !== 0) {
                drawTeam(cellPos, data.canvas[x][y], 0);
            }
        }
    }
});

function drawTeam(cell, team, size) {
    // update the matrix and continue drawing on the canvas
    setMatrixCell(cell, team, size);
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
    for (var i = -size; i <= size; i++) {
        for (var j = -size; j <= size; j++) {
            var newCell = {x: cell.x + i * cellScale.x, y: cell.y + j * cellScale.y}
            drawCircle(newCell, size);
        }
    }
    context.fillStyle = oldStyle;
    context.strokeStyle = oldStyle;
}


function drawCircle(cell, size) {
    // draw it twice so that the circle rim is more opaque
    for (var i = 0; i < 2; i++) {
        context.beginPath();
        context.arc(cell.x + cellSize/2,
                    cell.y + cellSize/2, 
                    cellSize / 4, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
        context.closePath();
    }
    generateSplats(cell, size);
}

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function generateSplats(cell, size) {
    var offset = 30;
    for (var i = 0; i < 3; i++) {
        var randX = Math.floor(random() * offset) - offset/2;
        var randY = Math.floor(random() * offset) - offset/2;
        var randRadius = 0.4 + 1.5 * random();

        context.beginPath();
        context.arc(cell.x + cellSize/2 + randX,
                    cell.y + cellSize/2 + randY, 
                    (cellSize) * randRadius, 0, 2 * Math.PI, false);
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
function findPos(e) { 
    var offsetX  = (e.offsetX || e.clientX - $(e.target).offset().left || e.targetTouches[0].pageX);
    var offsetY  = Math.floor(e.offsetY || e.clientY - $(e.target).offset().top || e.targetTouches[0].pageY);

    return {x: offsetX, y: offsetY};
}

// convert the canvas position from pixel coords to cell coords
function findCellPos(e) {
    var pos = findPos(e);
    var cellX = Math.floor(pos.x / cellScale.x);
    var cellY = Math.floor(pos.y / cellScale.y);

    if (lineMode.enabled && lineMode.xAxisLocked && mouseIsDown) {
        cellX = lineMode.cell.x;
    } else if (lineMode.enabled && lineMode.yAxisLocked && mouseIsDown) {
        cellY = lineMode.cell.y;
    }

    return {x: cellX, y: cellY};
}

function isSameTeamAt(cell, type) {
    return getTeamAt(cell) === type;
}

function erase(cell) {
    var left = cell.x;
    var top = cell.y;
    context.fillRect(left, top, cellSize, cellSize);
}

function log(msg) {
    if (debug) {
        console.log(msg);
    }
}

/** not used anymore, but you never knowwwww */
function pickNextColor(hex) {
    if (hex === white) {
        return TEAM_1;
    } else if (hex === lightGray) {
        return darkGray;
    } else if (hex === darkGray) {
        return TEAM_2;
    } else if (hex === TEAM_2 || hex === "#000000") {
        return white;
    }
}

// helper function for displaying floats to a certain percision
function toFixed(value, precision) {
    var precision = precision || 0,
        power = Math.pow(10, precision),
        absValue = Math.abs(Math.round(value * power)),
        result = (value < 0 ? '-' : '') + String(Math.floor(absValue / power));

    if (precision > 0) {
        var fraction = String(absValue % power),
            padding = new Array(Math.max(precision - fraction.length, 0) + 1).join('0');
        result += '.' + padding + fraction;
    }
    return result;
}

function startCountdown(timeout) {
    var timerEl = $("#timer");
    var timer = setInterval(function() {
        timeout = timeout - 100;
        var displayTime = toFixed(timeout / 1000, 1);
        timerEl.text(displayTime);
        if (timeout <= 0) {
            clearInterval(timer);
            // announceWinner(1, 20);
        }
    }, 100);
}


function announceWinner(team1, team2) {
    var text = "TEAM 1 IS THE WINNER!";
    if (team2 > team1) {
        text = "TEAM 2 IS THE WINNER!";
    }
    $("#winnar").show().text(text);
}

function startGame() {
    var arr = ["3", "2", "1", "DRAW!"];
    var timer = setInterval(function() {
        $("#winnar").show().text(text);
        if (arr.length === 0) {
            $("#winnar").hide();
        } else {
            var text = arr.splice(0, 1)
            $("#winnar").show().text(text);
        }
    }, 650);

    $("#winnar").show().text(text);
}

function getPixelColor(e) {
    var pos = findPos(e);
    var posColorData = context.getImageData(pos.x, pos.y, 1, 1).data;
    var hex = "#" + ("000000" + rgbToHex(posColorData[0], posColorData[1], posColorData[2])).slice(-6);
    log(hex);
    return hex;
}

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}
