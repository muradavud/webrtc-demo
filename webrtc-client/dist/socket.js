"use strict";
// export const socket = new WebSocket('localhost:8080/ws');
// socket.addEventListener('open', (event) => {
//     console.log('WebSocket is connected.');
// });
// socket.addEventListener('error', (event) => {
//     console.error('WebSocket error:', event);
//     alert('Could not connect to the WebSocket server. Please try again later.');
// });
// socket.addEventListener('close', (event) => {
//     console.log('WebSocket connection closed:', event);
//     //TODO
//     alert('WebSocket connection closed. Please refresh the page to try reconnecting.');
// });
// socket.addEventListener('message', async (event) => {
//     console.log('Message from server:', event.data);
//     const msg: Message = JSON.parse(event.data);
//     switch (msg.type) {
//         case MessageTypeOfferAck:
//             if (loadingSpinner) loadingSpinner.style.display = 'none';
//             case MessageTypeOffer:
//             await handleOffer(msg.payload as OfferPayload);
//             break;
//         case MessageTypeAnswer:
//             await handleAnswer(msg.payload as AnswerPayload);
//             break;
//         case MessageTypeCandidate:
//             await handleCandidate(msg.payload as CandidatePayload);
//             break;
//         default:
//             console.error('Unknown message type:', msg.type);
//     }
// });
// // Handle incoming offer
// async function handleOffer(offerPayload: OfferPayload) {
//     peerConnection = await createPeerConnection(peerConfiguration);
//     await peerConnection.setRemoteDescription(offerPayload.rtcSessionDescription);
//     const answer = await peerConnection.createAnswer();
//     await peerConnection.setLocalDescription(answer);
//     const msg: Message = {
//         type: MessageTypeAnswer,
//         payload: {
//             roomID: 1, // Example room ID
//             rtcSessionDescription: answer
//         }
//     };
//     socket.send(JSON.stringify(msg));
// }
// // Handle incoming answer
// async function handleAnswer(answerPayload: AnswerPayload) {
//     await peerConnection.setRemoteDescription(answerPayload.rtcSessionDescription);
// }
// // Handle incoming ICE candidate
// async function handleCandidate(candidatePayload: CandidatePayload) {
//     const candidate = new RTCIceCandidate({
//         candidate: candidatePayload.iceCandidate,
//         sdpMid: '',
//         sdpMLineIndex: 0
//     });
//     await peerConnection.addIceCandidate(candidate);
// }
