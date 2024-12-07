export const MessageTypeRooms = "rooms";
export const MessageTypeOffer = "offer";
export const MessageTypeOfferAck = "offerAck";
export const MessageTypeAnswer = "answer";
export const MessageTypeAnswerAck = "answerAck";
export const MessageTypeCandidate = "candidate";

export interface RoomListEntry {
    roomID: number;
    offererDesc: RTCSessionDescriptionInit;
}

export interface Message {
    type: string;
    payload: MessagePayload;
}

export type MessagePayload = null | OfferPayload | OfferAckPayload |
    AnswerPayload | CandidatePayload | RoomListPayload


export interface OfferPayload {
    rtcSessionDescription: RTCSessionDescriptionInit;
}

export interface OfferAckPayload {
    roomID: number;
}

export interface AnswerPayload {
    roomID: number;
    rtcSessionDescription: RTCSessionDescriptionInit;
}

export interface CandidatePayload {
    roomID: number;
    iceCandidate: RTCIceCandidateInit;
}

export interface RoomListPayload {
    rooms: RoomListEntry[];
}