import { Module } from "@nestjs/common";
import { EditStudentStateResolver } from "./edit-student-state.resolver";
import { EditStudentStateService } from "./edit-student-state.service";
import { PrismaModule } from "@src/prisma/prisma.module";
import { WebsocketModule } from "@src/websocket/websocket.module";

@Module({
  imports: [PrismaModule, WebsocketModule],
  providers: [EditStudentStateResolver, EditStudentStateService],
})
export class EditStudentStateModule {}