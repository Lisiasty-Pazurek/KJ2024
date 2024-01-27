let connection;
let playerName = localStorage.getItem('playerName');
let yourTurn = false;
let cmdInProgress = false;
let selectedCard = null;

$(document).ready(function () {
    $('#player-name-input').val(playerName);
    initServer();
});

function initServer() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("https://memethegatheringapi.azurewebsites.net/GameHub")
        // .withUrl("https://578d-87-206-130-93.ngrok-free.app/GameHub")
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

    connectToServer();
    initReceiveMethods();
    initSendMethods();
}

function connectToServer() {
    connection.start().then(() => {
        $('#createRoomButton').removeAttr('disabled', 'disabled');
        $('#joinRoomButton').removeAttr('disabled', 'disabled');
    }).catch(function (err) {
        return console.error("connectToServer :: " + err.toString());
    });

    connection.onclose(error => {
        $('#createRoomButton').attr('disabled');
        $('#joinRoomButton').attr('disabled');
    });
}

function initReceiveMethods() {
    connection.on("ReceiveMessage", function (user, message) {
        const msg = user + " mówi: " + message;
        const li = document.createElement("li");
        li.textContent = msg;
        document.getElementById("games-list").appendChild(li);
    });

    connection.on("ReceiveServerRoomMessage", function (message) {
        addToGameLog(message);
    });

    connection.on("LobbyError", function (message) {
        showLobbyErrorMessage(message);
    });

    connection.on("RoomError", function (message) {
        addToGameLog("<div class='color: red'>" + message + "</div>");
    });

    connection.on("ReceiveMessage", function (user, message) {
        const msg = user + " mówi: " + message;
        const li = document.createElement("li");
        li.textContent = msg;
        document.getElementById("games-list").appendChild(li);
    });

    connection.on("JoinedToRoom", function (roomID, isOwner, otherPlayers) {
        switchToRoom();
        $("[data-type='roomID']").text(roomID);
        if (isOwner) {
            $("#startGameButton").show();
        }
        $("#playerName").text(playerName);
        otherPlayers.forEach((playerName) => addPlayerZone(playerName));
    });

    connection.on("NewPlayerJoinedToRoom", function (playerName) {
        addToGameLog("Player " + playerName + " joined to the room!");
        addPlayerZone(playerName);
    });

    connection.on("GameStarted", function (playerName) {
        $("#startGameButton").hide();
    });

    connection.on("CardDrawn", function (deckId, url, target) {
        const newDiv = document.createElement('div');
        newDiv.className = 'card';
        newDiv.setAttribute('data-target', target);
        newDiv.setAttribute('data-deck-id', deckId);

        const newImg = document.createElement('img');
        newImg.src = url;

        newDiv.appendChild(newImg);

        const parentElement = document.querySelector('#playerHand .card-container');
        parentElement.appendChild(newDiv);
    });

    connection.on("TurnStarted", function () {
        yourTurn = true;
    });

    connection.on("TurnEnd", function () {
        yourTurn = false;
        removeAllSelectedOnCard();
    });
}

function initSendMethods() {
    document.getElementById("createRoomButton").addEventListener("click", function (event) {
        playerName = $('#player-name-input').val();
        localStorage.setItem('playerName', playerName);
        connection.invoke("CreateRoom", playerName).catch(function (err) {
            return console.error(err.toString());
        });
        event.preventDefault();
    });

    document.getElementById("joinRoomButton").addEventListener("click", function (event) {
        let roomID = $('#room-id-input').val();
        playerName = $('#player-name-input').val();
        localStorage.setItem('playerName', playerName);
        connection.invoke("JoinRoom", playerName, roomID).catch(function (err) {
            return console.error(err.toString());
        });
        event.preventDefault();
    });

    document.getElementById("startGameButton").addEventListener("click", function (event) {
        connection.invoke("StartGame").catch(function (err) {
            return console.error(err.toString());
        });
        event.preventDefault();
    });

    $('#playerHand').on('click', '.card', function () {
        disabledSelectPlayerMode();
        if (yourTurn === true) {
            let card = $(this);
            if(card.data('target') === 1){
                connection.invoke("SendCard", card.data('deck-id'), "Enemy").catch(function (err) {
                    return console.error(err.toString());
                });
            } else {
                removeAllSelectedOnCard();
                $(this).addClass('selected');
                enableSelectPlayerMode(card);
            }
        }
    });

    $('#playersZones').on('click', '.other.player', function () {
        let enemyName = $(this).data('player-name');
        if(selectedCard != null){
            connection.invoke("SendCard", selectedCard.data('deck-id'), enemyName).catch(function (err) {
                return console.error(err.toString());
            });
        }
        disabledSelectPlayerMode();

    });



    $('#playerZone').on('mouseenter', '.card', function () {
        showCardPreview(this, true);
    });

    $('.otherPlayerPersistentCards').on('mouseenter', '.card', function () {
        showCardPreview(this, false);
    });

    $(document).on('mouseleave', '.card', function () {
        hideCardPreview();
    });
}

function removeAllSelectedOnCard(){
    $('.card.selected').removeClass('selected');
}

function enableSelectPlayerMode(card){
    selectedCard = card;
    $('.other.player').addClass('focus');
}

function disabledSelectPlayerMode(){
    removeAllSelectedOnCard();
    $('.other.player').removeClass('focus');
}

function switchToLobby() {
    $('#lobby').show();
    $('#room').hide();
    window.onbeforeunload = null;
}


function switchToRoom() {
    $('#lobby').hide();
    $('#room').css('display', 'flex');
    window.onbeforeunload = function () {
        return "Are you sure you want to leave this page?";
    };
}

function addToGameLog(message) {
    let li = document.createElement("li");
    li.textContent = message;
    document.querySelector("#gameLog ul").appendChild(li);
}

function showLobbyErrorMessage(message) {
    $("#lobbyErrorMessage").html(message);
}

function addPlayerZone(playerName) {
    const playerZone = document.getElementById('playersZones');

    const playerDiv = document.createElement('div');
    playerDiv.className = 'other player';
    playerDiv.setAttribute('data-player-name', playerName);

    const nameElement = document.createElement('h2');
    nameElement.textContent = playerName;

    const laughElement = document.createElement('h2');
    laughElement.textContent = "LP: " + 0;
    const playerHandDiv = document.createElement('div');
    playerHandDiv.className = 'otherPlayerPersistentCards';

    playerDiv.appendChild(nameElement);
    playerDiv.appendChild(laughElement);
    playerDiv.appendChild(playerHandDiv);
    playerZone.appendChild(playerDiv);
}

function showCardPreview(card, player= false){
    if(player){
        $(".card-preview").addClass('player');
    } else {
        $(".card-preview").removeClass('player');
    }
    $(".card-preview").show();
    $(".card-preview img").attr('src', $('img', card).attr('src'));
}

function hideCardPreview() {
    $(".card-preview").hide();
}