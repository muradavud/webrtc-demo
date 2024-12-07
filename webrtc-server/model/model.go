package model

import "github.com/gorilla/websocket"

type Room struct {
	ID                int
	OffererConn       *websocket.Conn
	AnswererConn      *websocket.Conn
	OffererDesc       RTCSessionDescription
	AnswererDesc      RTCSessionDescription
	OffererCandidate  []RTCIceCandidateInit
	AnswererCandidate []RTCIceCandidateInit
}

type RoomListEntry struct {
	RoomID      int                   `json:"roomID"`
	OffererDesc RTCSessionDescription `json:"offererDesc"`
}

const (
	MessageTypeRooms     = "rooms"     // Message type for sending room list
	MessageTypeOffer     = "offer"     // Message type for creating a new room
	MessageTypeOfferAck  = "offerAck"  // Message type for confirming the creation of a new room
	MessageTypeAnswer    = "answer"    // Message type for answering an offer and receiving an answer
	MessageTypeCandidate = "candidate" // Message type for sending and receiving ICE candidates
)

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type OfferPayload struct {
	RTCSessionDescription RTCSessionDescription `json:"rtcSessionDescription"`
}

type AnswerPayload struct {
	RoomID                int                   `json:"roomID"`
	RTCSessionDescription RTCSessionDescription `json:"rtcSessionDescription"`
}

type OfferAckPayload struct {
	RoomID int `json:"roomID"`
}

type CandidatePayload struct {
	RoomID              int                 `json:"roomID"`
	RTCIceCandidateInit RTCIceCandidateInit `json:"RTCIceCandidateInit"` // Definiton from TypeScript
}

type RoomListPayload struct {
	RoomListEntry []RoomListEntry `json:"rooms"`
}

type RTCIceCandidateInit struct {
	Candidate        string  `json:"candidate,omitempty"`
	SDPMLineIndex    *int    `json:"sdpMLineIndex,omitempty"`
	SDPMid           *string `json:"sdpMid,omitempty"`
	UsernameFragment *string `json:"usernameFragment,omitempty"`
}

type RTCSessionDescription struct {
	Type string `json:"type"` // RTCSdpType = "answer" | "offer" | "pranswer" | "rollback"
	SDP  string `json:"sdp"`  // Session Description Protocol data
}
