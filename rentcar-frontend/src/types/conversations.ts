export type ConversationStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed'

export interface ConversationDto {
  id:                   number
  subject:              string
  status:               ConversationStatus
  rentalId:             number | null
  createdByUserId:      number
  createdByName:        string
  createdByAvatarUrl:   string | null   // Client avatar (admin uchun)
  createdAt:            string
  resolvedAt:           string | null
  participantCount:     number
  messageCount:         number
  lastMessageBody:      string | null
  lastMessageAt:        string | null
  unreadCount:          number
}

export interface MessageDto {
  id:              number
  conversationId:  number
  senderId:        number
  senderName:      string
  senderAvatarUrl: string | null
  senderRole:      string               // 'Admin' | 'SuperAdmin' | 'Manager' | 'Customer' | 'Owner'
  body:            string
  status:          string
  sentAt:          string
  isEdited:        boolean
  isDeleted:       boolean
}
