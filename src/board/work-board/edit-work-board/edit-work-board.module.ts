import { Module } from "@nestjs/common";
import { PrismaModule } from "@src/prisma/prisma.module";
import { S3Service } from "@src/s3/s3.service";
import { WebsocketModule } from "@src/websocket/websocket.module";
import { EditWorkBoardResolver } from "./edit-work-board.resolver";
import { EditWorkBoardService } from "./edit-work-board.service";

@Module({
  imports: [PrismaModule, WebsocketModule],
  providers: [EditWorkBoardResolver, EditWorkBoardService, S3Service],
})
export class EditWorkBoardModule {}
