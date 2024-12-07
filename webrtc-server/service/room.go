package service

import (
	"errors"
	"math/rand"
	"time"
	"webrtc-server/model"
)

type RoomService interface {
	GetAllRooms() ([]model.Room, error)
	CreateRoom() (int, error)
	DeleteRoom(int) error
	GetRoomByID(int) (*model.Room, error)
}

type RoomServiceListImpl struct {
	Rooms      []model.Room
	randomSeed *rand.Rand
}

func NewListRoomService() *RoomServiceListImpl {
	roomService := &RoomServiceListImpl{
		Rooms: []model.Room{},
	}
	roomService.randomSeed = rand.New(rand.NewSource(time.Now().UnixNano()))

	return roomService
}

func (lrs *RoomServiceListImpl) GetAllRooms() ([]model.Room, error) {
	return lrs.Rooms, nil
}

func (lrs *RoomServiceListImpl) GetRoomByID(roomID int) (*model.Room, error) {
	for i, room := range lrs.Rooms {
		if room.ID == roomID {
			return &lrs.Rooms[i], nil
		}
	}

	return nil, errors.New("room not found")
}

func (lrs *RoomServiceListImpl) CreateRoom() (int, error) {
	room := model.Room{
		ID: lrs.randomSeed.Intn(1000),
	}
	lrs.Rooms = append(lrs.Rooms, room)

	return room.ID, nil
}

func (lrs *RoomServiceListImpl) DeleteRoom(roomID int) error {
	for i, room := range lrs.Rooms {
		if room.ID == roomID {
			lrs.Rooms = append(lrs.Rooms[:i], lrs.Rooms[i+1:]...)
			return nil
		}
	}

	return errors.New("room not found")
}
