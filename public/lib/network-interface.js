$(document).ready(function() {
    
    window.socket = io.connect('192.168.1.8:8001');

    window.socket.emit('subscribe', { msg: "hello! I am " + id, id: id });

    /* from other clients (via the server) */
    window.socket.on('render-canvas', function(data) {
        $("#canvas").trigger("renderCanvas", { events: data.events });
    });

    // forwarded by server
    window.socket.on("draw", whenNotMyEvent(function(data) {
        // scale the cell UP from grid coordinates to screen coordinates
        // e.g. x: 42th cell in that row => x: 420px 
        var cell = {x: data.cell.x * cellScale.x, 
                    y: data.cell.y * cellScale.y};

        drawTeam(cell, data.team, data.size);
    }));

    // forwarded by server
    window.socket.on("clear", whenNotMyEvent(function(data) {
        clearScreen();
    }));

    window.socket.on("update-percent", function(data) {
        updatePercent(data.team1 * 100, data.team2 * 100);
    });

    window.socket.on("set-team", function(data) {
        assignTeam(data.team);
    });

    window.socket.on("start", function(data) {
        startGame(data.deadline, data.immediately, data.timeout);
    });

    window.socket.on("waiting", function(data) {
        waitGame();
    });

    window.socket.on("end", function(data) {
        announceWinner(data.team1, data.team2);
    });

    window.socket.on("start-timer", function(data) {
        startCountdown(data.deadline, data.timeout);
    });

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

