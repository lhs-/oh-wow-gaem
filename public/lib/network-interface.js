$(document).ready(function() {
    // window.socket = io.connect('10.20.4.88:8001');

    window.socket= new WebSocket("ws://10.20.4.74:8001");
    // window.socket.emit('subscribe', {msg: "hello! I am " + id, id: id});


    window.socket.onopen = function(event){
        // For reasons I can't determine, onopen gets called twice
        // and the first time event.data is undefined.
        // Leave a comment if you know the answer.
        // if(event.data === undefined)
        //     return;

        console.log("onopen", event.data);
        if (tryingNewConn) {
            tryingNewConn = false;
            var jason = {event: "hello", payload: {team: currentTeam}};
            window.socket.send(JSON.stringify(jason));
        } else {
            window.socket.send("team-request");
            // keep-alive olol
            setInterval(function() {
                window.socket.send("ping");
            }, 1000);
        }
    };

    window.socket.onmessage = function(event){
        // console.log("onmsg", event.data);
        var lastIndex = event.data.lastIndexOf("}")
        if (event.data.indexOf("ping") !== -1) {
            return;
        }
        var info = JSON.parse(event.data.substring(0, lastIndex+1));


        // handle all the different events
        if (info.event === "set-team") {
            // console.log("set-team: ", info.payload);
            assignTeam(info.payload.team);
        } else if (info.event === "start") {
        } else if (info.event === "join") {
            // when this player joins the game
            // console.log("join da game");
            updatePercent(info.payload.team1 * 100, info.payload.team2 * 100);
            $("#canvas").trigger("renderCanvas", {canvas: info.payload.canvas});
        } else if (info.event === "end") {
        } else if (info.event === "timer-start") {
        } else if (info.event === "update-percent") {
            updatePercent(info.payload.team1 * 100, info.payload.team2 * 100);
        } else if (info.event === "draw") {
            // scale the cell UP from grid coordinates to screen coordinates
            // e.g. x: 42th cell in that row => x: 420px 
            var cell = {x: info.payload.x * cellScale.x, 
                        y: info.payload.y * cellScale.y};
            //console.log(cell);
            drawTeam(cell, info.payload.team, info.payload.size);
        } else if (info.event === "clear") {
        } else {
            // console.log("unknown event", info.event);
        }
    };

    var tryingNewConn = false;
    window.socket.onclose = function(event){
        console.log("onclose", "Connection closed");
        if (!tryingNewConn) {
                tryingNewConn = true;
            setTimeout(function() {
                window.socket= new WebSocket("ws://10.20.4.74:8001");
            }, 500);
        }
    };







    // /* from other clients (via the server) */
    // window.socket.on('peer connected', function(data) {
    //     if (id === data.id) {
    //         console.log("CANVAS TIME!");
    //         var canvas = JSON.parse(data.canvas);
    //         $("#canvas").trigger("renderCanvas", {canvas: canvas});
    //         console.log(data.response);
    //     }
    // });

    // window.socket.on("draw", whenNotMyEvent(function(data) {
    //     // scale the cell UP from grid coordinates to screen coordinates
    //     // e.g. x: 42th cell in that row => x: 420px 
    //     var cell = {x: data.cell.x * cellScale.x, 
    //                 y: data.cell.y * cellScale.y};
    //     //console.log(cell);
    //     drawTeam(cell, data.team, data.size);
    //     // draw(cell, data.style);
    // }));

    // window.socket.on("clear", whenNotMyEvent(function(data) {
    //     clearScreen();
    // }));

    // window.socket.on("update-percent", whenNotMyEvent(function(data) {
    //     updatePercent(data.team1, data.team2);
    // }));

    // window.socket.on("set-team", whenNotMyEvent(function(data) {
    // }));

    // window.socket.on("start", whenNotMyEvent(function(data) {
    // }));

    // window.socket.on("end", whenNotMyEvent(function(data) {
    //     console.log(data.team1, data.team2);
    //     announceWinner(data.team1, data.team2);
    // }));

    // window.socket.on("timer-start", whenNotMyEvent(function(data) {
    //     console.log("timer start! T-",data.timeout);
    //     startCountdown(data.timeout);
    // }));

    // /* from (this) client's events */
    $("#canvas").on("draw", function(event, drawData) {
        // scale the cell down from screen coordinates to grid coordinates
        // e.g. x: 240px => x: 24th cell in that row
        var cell = {x: Math.floor(drawData.cell.x),
                    y: Math.floor(drawData.cell.y)}
        var payload = {event: "draw", payload: {x: cell.x, y: cell.y, team: drawData.team, size: drawData.size, id: id}};
        // var payload = {event: "draw", payload: {x: 23, y: 42, team: 2, size: 0, id: id}};
        window.socket.send(JSON.stringify(payload));
    });

    // $("#canvas").on("clear", function(event) {
    //     window.socket.emit("clear", {id: id});
    // });

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

