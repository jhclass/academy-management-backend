import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  WebSocketServer,
  //MessageBody,
  //SubscribeMessage,
} from "@nestjs/websockets";
import { Subject } from "rxjs";
import { Server, Socket } from "socket.io";

@WebSocketGateway(4001, {
  path: "/socket.io", // 소켓 연결 path 설정
  cors: {
    origin: "http://localhost:8000", // 허용할 프론트엔드 주소
    methods: ["GET", "POST"], // 허용할 HTTP 메서드
    credentials: true, // 인증 정보 포함 허용
  },
  namespace: "gms-new-works",
})
export class WebSocketGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly connectionSubject = new Subject<Socket>();
  private readonly disconnectionSubject = new Subject<Socket>();
  private readonly notificationSubject = new Subject<{
    event: string;
    payload: any;
  }>();

  constructor() {
    this.connectionSubject.subscribe((client) => {
      console.log("RxJS: New client connected", client.id);
    });
    this.notificationSubject.subscribe(({ event, payload }) => {
      this.server.emit(event, payload);
      console.log(
        `RxJS: Notification sent [${event}]:`,
        JSON.stringify(payload),
      );
    });
  }

  afterInit(server: Server) {
    const path = Reflect.get(server, "opts")?.path;
    console.log("WebSocket Server Path:", path || "default path");
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    const token =
      client.handshake.headers?.token || client.handshake.auth?.token;
    if (!token) {
      console.log("Invalid token, closing connection");
      client.disconnect();
      return;
    }
    console.log("Client connected:", client.id);
    this.connectionSubject.next(client);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.disconnectionSubject.next(client);
  }
  sendNewStudentStateNotification(payload: any) {
    this.notificationSubject.next({ event: "NEW_STUDENTSTATE", payload });
  }
  sendNewStudentNotification(payload: any) {
    this.notificationSubject.next({ event: "NEW_STUDENT", payload });
  }
  sendNewWorkBoardNotification(payload: any) {
    this.notificationSubject.next({ event: "NEW_WORK_BOARD", payload });
  }
}
