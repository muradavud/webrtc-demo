package controller

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"webrtc-server/model"
	"webrtc-server/service"
)

type Controller struct {
	roomService service.RoomService
	upgrader    websocket.Upgrader
}

func NewController(roomService service.RoomService) *Controller {
	return &Controller{
		roomService: roomService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (cont *Controller) HandleWebSocket(c *gin.Context) {
	ws, err := cont.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	var currentRoom **model.Room = new(*model.Room)
	defer HandleClose(ws, currentRoom, cont.roomService)

	for {
		var msg model.Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading JSON: %v", err)
			break
		}

		log.Printf("Received message of type %v", msg.Type)

		switch msg.Type {

		case model.MessageTypeRooms:
			rooms, err := cont.roomService.GetAllRooms()
			if err != nil {
				log.Printf("Error getting rooms: %v", err)
				break
			}
			roomEntry := make([]model.RoomListEntry, len(rooms))
			for i, room := range rooms {
				roomEntry[i].RoomID = room.ID
				roomEntry[i].OffererDesc = room.OffererDesc
			}
			err = ws.WriteJSON(model.Message{
				Type:    model.MessageTypeRooms,
				Payload: model.RoomListPayload{RoomListEntry: roomEntry},
			})
			if err != nil {
				log.Printf("Error writing JSON: %v", err)
			}

		case model.MessageTypeOffer:
			var payload model.OfferPayload
			data, _ := json.Marshal(msg.Payload)
			err := json.Unmarshal(data, &payload)
			if err != nil {
				log.Printf("Error unmarshaling payload: %v", err)
				break
			}
			if *currentRoom != nil {
				log.Printf("Offer received while in a room")
				cont.roomService.DeleteRoom((*currentRoom).ID)
			}
			roomId, err := cont.roomService.CreateRoom()
			if err != nil {
				log.Printf("Error creating room: %v", err)
				break
			}
			room, err := cont.roomService.GetRoomByID(roomId)
			*currentRoom = room
			if err != nil {
				log.Printf("Error getting room: %v", err)
				break
			}
			room.OffererConn = ws
			room.OffererDesc = payload.RTCSessionDescription
			err = ws.WriteJSON(model.Message{
				Type:    model.MessageTypeOfferAck,
				Payload: model.OfferAckPayload{RoomID: roomId},
			})
			if err != nil {
				log.Printf("Error writing JSON: %v", err)
			}

		case model.MessageTypeAnswer:
			var payload model.AnswerPayload
			data, _ := json.Marshal(msg.Payload)
			err := json.Unmarshal(data, &payload)
			if err != nil {
				log.Printf("Error unmarshaling payload: %v", err)
				break
			}
			room, err := cont.roomService.GetRoomByID(payload.RoomID)
			if err != nil {
				log.Printf("Error getting room: %v", err)
				break
			}
			if ws == room.OffererConn {
				log.Printf("Offerer tried to answer their own offer")
				break
			}
			if *currentRoom != nil {
				log.Printf("Answer received while in a room")
				cont.roomService.DeleteRoom((*currentRoom).ID)
			}
			room.AnswererConn = ws
			room.AnswererDesc = payload.RTCSessionDescription
			err = room.OffererConn.WriteJSON(msg)
			if err != nil {
				log.Printf("Error writing JSON: %v", err)
			}

		case model.MessageTypeCandidate:
			var payload model.CandidatePayload
			data, _ := json.Marshal(msg.Payload)
			err := json.Unmarshal(data, &payload)
			if err != nil {
				log.Printf("Error unmarshaling payload: %v", err)
				break
			}
			room, err := cont.roomService.GetRoomByID(payload.RoomID)
			if err != nil {
				log.Printf("Error getting room: %v", err)
				break
			}
			if room.OffererConn == ws {
				room.OffererCandidate = append(room.OffererCandidate, payload.RTCIceCandidateInit)
				// If answerer is connected, send candidate to answerer
				// Otherwise, store candidate in room and send it to offerer when answerer connects
				if room.AnswererConn != nil {
					err = room.AnswererConn.WriteJSON(msg)
					if err != nil {
						log.Printf("Error writing JSON: %v", err)
					}
				}
			} else {
				room.AnswererCandidate = append(room.AnswererCandidate, payload.RTCIceCandidateInit)
				err = room.OffererConn.WriteJSON(msg)
				if err != nil {
					log.Printf("Error writing JSON: %v", err)
				}
			}

		case "test":
			rooms, err := cont.roomService.GetAllRooms()
			if err != nil {
				log.Printf("Error getting rooms: %v", err)
				break
			}
			for _, room := range rooms {
				err = ws.WriteJSON(room)
				if err != nil {
					log.Printf("Error writing JSON: %v", err)
				}
			}

		default:
			log.Printf("Invalid message type: %v", msg.Type)
		}
	}
}

func HandleClose(ws *websocket.Conn, room **model.Room, roomService service.RoomService) {
	log.Printf("Closing WebSocket")

	if room != nil && *room != nil {
		roomService.DeleteRoom((*room).ID)
	}

	err := ws.Close()
	if err != nil {
		log.Printf("Error closing WebSocket: %v", err)
	}
}
