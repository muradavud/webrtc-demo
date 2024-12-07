var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { rtcConfig, wsAddress } from './config.js';
import { MessageTypeAnswer, MessageTypeCandidate, MessageTypeOffer, MessageTypeOfferAck, MessageTypeRooms } from './model.js';
const userName = "User-" + Math.floor(Math.random() * 1000);
const roomsMap = new Map();
let currentRoomID;
let socket;
let peerConnection;
let localStream;
let remoteStream;
const userNameEl = document.querySelector('#user-name');
const roomIDEl = document.querySelector('#room-id');
const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');
const roomsEl = document.querySelector('#rooms');
const NewRoomButtonEl = document.querySelector('#new-room');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        socket = new WebSocket(wsAddress);
        addSocketEventListeners(socket);
        if (userNameEl)
            userNameEl.innerHTML = userName;
        localStream = yield fetchUserMedia();
        if (!localVideoEl)
            throw new Error('Local video element not found');
        localVideoEl.srcObject = localStream;
        remoteStream = new MediaStream();
        if (!remoteVideoEl)
            throw new Error('Remote video element not found');
        remoteVideoEl.srcObject = remoteStream;
        setInterval(requestRoomList, 2000);
        if (!NewRoomButtonEl)
            throw new Error('New room button element not found');
        NewRoomButtonEl.addEventListener('click', newRoom);
    });
}
main().catch(console.error);
function fetchUserMedia() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stream = yield navigator.mediaDevices.getUserMedia({
                video: true,
                // audio: true,
            });
            return stream;
        }
        catch (err) {
            console.error('Error accessing user media:', err);
            throw err;
        }
    });
}
function createPeerConnection(config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pc = new RTCPeerConnection(config);
            pc.addEventListener('icecandidate', e => {
                console.log('Local ice candidate found.');
                if (e.candidate) {
                    const msg = {
                        type: MessageTypeCandidate,
                        payload: {
                            roomID: currentRoomID,
                            iceCandidate: e.candidate.toJSON()
                        }
                    };
                    socket.send(JSON.stringify(msg));
                }
            });
            pc.addEventListener('track', e => {
                console.log("Got a track from the other peer!");
                e.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });
            });
            return pc;
        }
        catch (err) {
            console.error('Error creating peer connection:', err);
            throw err;
        }
    });
}
function newRoom() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield leaveRoom();
            peerConnection = yield createPeerConnection(rtcConfig);
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            console.log("Creating offer...");
            const offererDesc = yield peerConnection.createOffer();
            peerConnection.setLocalDescription(offererDesc);
            const msg = {
                type: MessageTypeOffer,
                payload: {
                    rtcSessionDescription: offererDesc
                }
            };
            socket.send(JSON.stringify(msg));
        }
        catch (err) {
            console.error('Error creating offer:', err);
        }
    });
}
function connectToRoom(room) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield leaveRoom();
            peerConnection = yield createPeerConnection(rtcConfig);
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            console.log("Connecting to room...");
            updateRoomIDDisplay(room.roomID);
            peerConnection.setRemoteDescription(room.offererDesc);
            const answererDesc = yield peerConnection.createAnswer();
            peerConnection.setLocalDescription(answererDesc);
            const msg = {
                type: MessageTypeAnswer,
                payload: {
                    roomID: room.roomID,
                    rtcSessionDescription: answererDesc
                }
            };
            socket.send(JSON.stringify(msg));
        }
        catch (err) {
            console.error('Error connecting to room:', err);
        }
    });
}
function leaveRoom() {
    return __awaiter(this, void 0, void 0, function* () {
        if (peerConnection)
            peerConnection.close();
        updateRoomIDDisplay(null);
    });
}
/* -------------------------------------------------------------------------- */
/*                                     UI                                     */
/* -------------------------------------------------------------------------- */
function updateRoomIDDisplay(roomID) {
    if (!roomIDEl)
        throw new Error('Room ID element not found');
    if (roomID) {
        currentRoomID = roomID;
        roomIDEl.textContent = roomID.toString();
    }
    else {
        currentRoomID = 0;
        roomIDEl.textContent = ' ';
    }
}
function updateRoomList(rooms) {
    roomsMap.forEach((_, roomID) => {
        const roomElement = roomsMap.get(roomID);
        if (roomElement && roomsEl) {
            roomsEl.removeChild(roomElement);
            roomsMap.delete(roomID);
        }
    });
    rooms.forEach(room => {
        if (!roomsEl)
            throw new Error('Rooms element not found');
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = `Room ID: ${room.roomID}`;
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        button.textContent = 'Connect';
        button.disabled = room.roomID === currentRoomID;
        button.addEventListener('click', () => connectToRoom(room));
        li.appendChild(button);
        roomsEl.appendChild(li);
        roomsMap.set(room.roomID, li);
    });
}
function requestRoomList() {
    const msg = {
        type: MessageTypeRooms,
        payload: null
    };
    socket.send(JSON.stringify(msg));
}
/* -------------------------------------------------------------------------- */
/*                                  WebSocket                                 */
/* -------------------------------------------------------------------------- */
function addSocketEventListeners(socket) {
    socket.addEventListener('open', (event) => {
        console.log('WebSocket is connected.');
    });
    socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        alert('Could not connect to the WebSocket server. Please try again later.');
    });
    socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event);
        alert('WebSocket connection closed. Please refresh the page to try reconnecting.');
    });
    socket.addEventListener('message', (event) => __awaiter(this, void 0, void 0, function* () {
        // console.log('Message from server:', event.data);
        const msg = JSON.parse(event.data);
        switch (msg.type) {
            case MessageTypeOfferAck:
                console.log('Offer Acknowledged.');
                const offerAckPayload = msg.payload;
                updateRoomIDDisplay(offerAckPayload.roomID);
                break;
            case MessageTypeRooms:
                console.log('Room list received.');
                const roomListPayload = msg.payload;
                updateRoomList(roomListPayload.rooms);
                break;
            case MessageTypeCandidate:
                console.log('Candidate received.');
                const candidatePayload = msg.payload;
                const candidate = new RTCIceCandidate(candidatePayload.iceCandidate);
                peerConnection.addIceCandidate(candidate);
                break;
            case MessageTypeAnswer:
                console.log('Answer received.');
                const answerPayload = msg.payload;
                yield peerConnection.setRemoteDescription(answerPayload.rtcSessionDescription);
                break;
            default:
                console.error('Unknown message type:', msg.type);
        }
    }));
}
