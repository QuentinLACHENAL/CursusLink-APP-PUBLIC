import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Autoriser le frontend
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
  }

  @SubscribeMessage('joinPrivate')
  handleJoinPrivate(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(`user_${userId}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() payload: { sender: string; senderId: string; text: string; coalition: string; room?: string; targetId?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    // Cas 1 : Message Privé (DM)
    if (payload.targetId) {
      // Envoyer au destinataire
      this.server.to(`user_${payload.targetId}`).emit('receiveMessage', {
        ...payload,
        room: `dm_${payload.senderId}`, // Le receveur verra ça dans le canal "dm_SENDER"
        timestamp: new Date().toISOString(),
      });
      // Renvoyer à l'expéditeur (pour qu'il le voie dans son propre chat)
      client.emit('receiveMessage', {
        ...payload,
        room: `dm_${payload.targetId}`, // L'expéditeur verra ça dans le canal "dm_TARGET"
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Cas 2 : Message de Salle (Général / Coalition)
    const room = payload.room || 'general';
    this.server.to(room).emit('receiveMessage', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() payload: { name: string; school: string }, @ConnectedSocket() client: Socket) {
    const schoolRoom = `school_${payload.school}`;
    client.join(schoolRoom);
    
    // Notification discrète (seulement à l'école)
    client.broadcast.to(schoolRoom).emit('receiveMessage', {
      sender: 'Système',
      text: `${payload.name} a rejoint le campus.`,
      coalition: 'System',
      room: schoolRoom, // Important pour le front
      timestamp: new Date().toISOString(),
    });
  }
}