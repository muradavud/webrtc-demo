import { rtcConfig, wsAddress } from './config.js';
import {
    AnswerPayload,
    CandidatePayload,
    Message, MessageTypeAnswer, MessageTypeCandidate, MessageTypeOffer, MessageTypeOfferAck,
    MessageTypeRooms,
    OfferAckPayload,
    RoomListEntry,
    RoomListPayload
} from './model.js';

const userName: string = "User-" + Math.floor(Math.random() * 1000);
const roomsMap = new Map<number, HTMLLIElement>();
let currentRoomID: number;

let socket: WebSocket;
let peerConnection: RTCPeerConnection;
let localStream: MediaStream;
let remoteStream: MediaStream

const userNameEl: Element | null = document.querySelector('#user-name');
const roomIDEl: HTMLElement | null = document.querySelector('#room-id');
const localVideoEl: HTMLMediaElement | null = document.querySelector('#local-video');
const remoteVideoEl: HTMLMediaElement | null = document.querySelector('#remote-video');
const roomsEl: HTMLElement | null = document.querySelector('#rooms');
const NewRoomButtonEl: HTMLElement | null = document.querySelector('#new-room');

async function main() {
    socket = new WebSocket(wsAddress);
    addSocketEventListeners(socket);

    if (userNameEl) userNameEl.innerHTML = userName;

    localStream = await fetchUserMedia();
    if (!localVideoEl) throw new Error('Local video element not found');
    localVideoEl.srcObject = localStream

    remoteStream = new MediaStream();
    if (!remoteVideoEl) throw new Error('Remote video element not found');
    remoteVideoEl.srcObject = remoteStream;

    setInterval(requestRoomList, 2000);

    if (!NewRoomButtonEl) throw new Error('New room button element not found');
    NewRoomButtonEl.addEventListener('click', newRoom);
}

main().catch(console.error);

async function fetchUserMedia(): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            // audio: true,
        }) as MediaStream;
        return stream;
    } catch (err) {
        console.error('Error accessing user media:', err);
        throw err;
    }
}

async function createPeerConnection(config: RTCConfiguration): Promise<RTCPeerConnection> {
    try {
        const pc = new RTCPeerConnection(config);
        pc.addEventListener('icecandidate', e => {
            console.log('Local ice candidate found.');
            if (e.candidate) {
                const msg: Message = {
                    type: MessageTypeCandidate,
                    payload: {
                        roomID: currentRoomID,
                        iceCandidate: e.candidate.toJSON()
                    } as CandidatePayload
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
    } catch (err) {
        console.error('Error creating peer connection:', err);
        throw err;
    }
}

async function newRoom() {
    try {
        await leaveRoom();

        peerConnection = await createPeerConnection(rtcConfig);
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        console.log("Creating offer...");

        const offererDesc = await peerConnection.createOffer();
        peerConnection.setLocalDescription(offererDesc);

        const msg: Message = {
            type: MessageTypeOffer,
            payload: {
                rtcSessionDescription: offererDesc
            }
        };
        socket.send(JSON.stringify(msg));
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

async function connectToRoom(room: RoomListEntry) {
    try {
        await leaveRoom();

        peerConnection = await createPeerConnection(rtcConfig);
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        console.log("Connecting to room...");
        updateRoomIDDisplay(room.roomID);

        peerConnection.setRemoteDescription(room.offererDesc);
        const answererDesc = await peerConnection.createAnswer();
        peerConnection.setLocalDescription(answererDesc);

        const msg: Message = {
            type: MessageTypeAnswer,
            payload: {
                roomID: room.roomID,
                rtcSessionDescription: answererDesc
            } as AnswerPayload
        };
        socket.send(JSON.stringify(msg));
    } catch (err) {
        console.error('Error connecting to room:', err);
    }
}

async function leaveRoom() {
    if (peerConnection) peerConnection.close();
    updateRoomIDDisplay(null);
}

/* -------------------------------------------------------------------------- */
/*                                     UI                                     */
/* -------------------------------------------------------------------------- */

function updateRoomIDDisplay(roomID: number | null) {
    if (!roomIDEl) throw new Error('Room ID element not found')
    if (roomID) {
        currentRoomID = roomID;
        roomIDEl.textContent = roomID.toString();
    } else {
        currentRoomID = 0;
        roomIDEl.textContent = ' ';
    }
}

function updateRoomList(rooms: RoomListEntry[]) {
    roomsMap.forEach((_, roomID) => {
        const roomElement = roomsMap.get(roomID);
        if (roomElement && roomsEl) {
            roomsEl.removeChild(roomElement);
            roomsMap.delete(roomID);
        }
    });

    rooms.forEach(room => {
        if (!roomsEl) throw new Error('Rooms element not found');
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
    const msg: Message = {
        type: MessageTypeRooms,
        payload: null
    };
    socket.send(JSON.stringify(msg));
}

/* -------------------------------------------------------------------------- */
/*                                  WebSocket                                 */
/* -------------------------------------------------------------------------- */

function addSocketEventListeners(socket: WebSocket) {
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

    socket.addEventListener('message', async (event) => {
        // console.log('Message from server:', event.data);
        const msg: Message = JSON.parse(event.data);

        switch (msg.type) {
            case MessageTypeOfferAck:
                console.log('Offer Acknowledged.');
                const offerAckPayload = msg.payload as OfferAckPayload;
                updateRoomIDDisplay(offerAckPayload.roomID);
                break;
            case MessageTypeRooms:
                console.log('Room list received.');
                const roomListPayload = msg.payload as RoomListPayload;
                updateRoomList(roomListPayload.rooms);
                break;
            case MessageTypeCandidate:
                console.log('Candidate received.');
                const candidatePayload = msg.payload as CandidatePayload;
                const candidate = new RTCIceCandidate(candidatePayload.iceCandidate);
                peerConnection.addIceCandidate(candidate);
                break
            case MessageTypeAnswer:
                console.log('Answer received.');
                const answerPayload = msg.payload as AnswerPayload;
                await peerConnection.setRemoteDescription(answerPayload.rtcSessionDescription);
                break
            default:
                console.error('Unknown message type:', msg.type);
        }
    });

}

