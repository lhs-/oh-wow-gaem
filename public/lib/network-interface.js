$(document).ready(function() {
    
    window.socket = io.connect('10.20.4.37:8001');

    window.socket.emit('subscribe', {msg: "hello! I am " + id, id: id});

    /* from other clients (via the server) */
    window.socket.on('peer connected', function(data) {
        if (id === data.id) {
            console.log("CANVAS TIME!");
            var canvas = JSON.parse(data.canvas);
            $("#canvas").trigger("renderCanvas", {canvas: canvas});
            console.log(data.response);
        }
    });

    window.socket.on("draw", whenNotMyEvent(function(data) {
        // scale the cell UP from grid coordinates to screen coordinates
        // e.g. x: 42th cell in that row => x: 420px 
        var cell = {x: data.cell.x * cellScale.x, 
                    y: data.cell.y * cellScale.y};
        //console.log(cell);
        drawTeam(cell, data.team, data.size);
        // draw(cell, data.style);
    }));

    window.socket.on("clear", whenNotMyEvent(function(data) {
        clearScreen();
    }));

    window.socket.on("update-percent", whenNotMyEvent(function(data) {
        updatePercent(data.team1 * 100, data.team2 * 100);
    }));

    window.socket.on("set-team", whenNotMyEvent(function(data) {
        assignTeam(data.team);
    }));

    window.socket.on("start", whenNotMyEvent(function(data) {
        startGame(data.started);
    }));

    window.socket.on("waiting", whenNotMyEvent(function(data) {
        waitGame();
    }));

    window.socket.on("end", whenNotMyEvent(function(data) {
        console.log(data.team1, data.team2);
        announceWinner(data.team1, data.team2);
    }));

    window.socket.on("start-timer", whenNotMyEvent(function(data) {
        console.log("timer start! T-",data.timeout);
        game.started = true; // true for hack
        startCountdown(data.timeout);
    }));

    /* from (this) client's events */
    $("#canvas").on("draw", function(event, drawData) {
        if (!game.started) return;
        window.socket.emit("draw", {
            cell: drawData.cell, 
            team: drawData.team, 
            size: drawData.size, 
            id: id
        });
    });

    $("#canvas").on("clear", function(event) {
        window.socket.emit("clear", {id: id});
    });

    function log(msg) {
        console.log("NET INT: " + msg);
    }

    function whenNotMyEvent(f) {
        return function(){
            // log(" my id is " + id + " received id: " + arguments[0].id);
            if (id !== arguments[0].id) {
                f.apply(this, arguments);
            }
        };
    }
});

