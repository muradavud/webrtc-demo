package main

import (
	"github.com/gin-gonic/gin"
	"webrtc-server/controller"
	"webrtc-server/service"
)

func main() {
	roomService := service.NewListRoomService()
	cont := controller.NewController(roomService)

	r := gin.Default()
	
	r.GET("/ws", cont.HandleWebSocket)

	r.Run(":8080")
}
