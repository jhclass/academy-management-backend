import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { S3Service } from "@src/s3/s3.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
import { EditWorkBoardDto } from "./dto/edit-work-board.dto";

@Injectable()
export class EditWorkBoardService {
  constructor(
    private readonly client: PrismaService,
    private readonly s3Service: S3Service,
    private readonly gateway: WebSocketGatewayService,
  ) {}

  async editWorkBoardFunc(context: any, editWorkBoardDto: EditWorkBoardDto) {
    try {
      const { user } = context.req;
      const branchId = user.branchId;
      const client = this.client;
      const {
        id,
        title,
        writer,
        toPerson,
        toTeam,
        startDate,
        endDate,
        lastModifiedTime,
        filePath,
        fileName,
        workStatus,
        detail,
        level,
      } = editWorkBoardDto;

      const existingWorkBoard = await client.workBoard.findUnique({
        where: {
          id,
        },
      });
      if (!existingWorkBoard || existingWorkBoard.branchId !== branchId) {
        throw new NotFoundException("수정할 업무 게시글을 찾을 수 없습니다.");
      }

      const nextToPerson = toPerson ?? existingWorkBoard.toPerson;
      const nextToTeam = toTeam ?? existingWorkBoard.toTeam;
      let targetManagerId: number | null = null;
      const hasNewAssignee = Boolean(nextToPerson);
      const assigneeChanged =
        nextToPerson !== existingWorkBoard.toPerson ||
        nextToTeam !== existingWorkBoard.toTeam;

      if (hasNewAssignee && assigneeChanged) {
        if (!nextToTeam) {
          throw new BadRequestException(
            "전달 받을 부서가 올바르게 입력되었는지 확인하세요.",
          );
        }
        const targetManager = await client.manageUser.findFirst({
          where: {
            mUsername: nextToPerson,
            mPart: {
              has: nextToTeam,
            },
            branchId,
          },
          select: {
            id: true,
            mUsername: true,
          },
        });
        if (!targetManager) {
          throw new NotFoundException(
            "전달 받을 직원의 이름과 부서를 다시 확인하세요.",
          );
        }
        targetManagerId = targetManager.id;
      }

      const extractSrcValues = (htmlString: string): string[] => {
        const srcRegex = /<img\s+[^>]*src="([^"]+)"/g;
        const srcValues = [];
        let match;
        while ((match = srcRegex.exec(htmlString)) !== null) {
          srcValues.push(match[1]);
        }
        return srcValues;
      };

      let updateDetail = detail;
      if (detail) {
        const srcValues = extractSrcValues(detail);
        const urls = await this.s3Service.uploadBase64Images(
          srcValues,
          "board/editor",
        );
        const imgSrcRegex = /<img\s+[^>]*src="data:image\/[^"]+"[^>]*>/g;
        const matches = detail.match(imgSrcRegex);
        if (matches && matches.length > 0) {
          matches.forEach((imgTag, index) => {
            if (urls[index]) {
              const newImgTag = imgTag.replace(
                /src="[^"]+"/,
                `src=${urls[index]}`,
              );
              updateDetail = updateDetail.replace(imgTag, newImgTag);
            }
          });
        }
      }

      const updatedWorkBoard = await client.workBoard.update({
        where: {
          id,
        },
        data: {
          title,
          writer,
          toPerson,
          toTeam,
          startDate,
          endDate,
          lastModifiedTime,
          filePath,
          fileName,
          workStatus,
          level,
          detail: updateDetail,
        },
      });

      if (targetManagerId) {
        const createAlarm = await client.alarm.create({
          data: {
            title: "업무 요청",
            content: `${writer || user?.mUsername || "작성자"}님이 ${nextToPerson}님에게 업무를 요청했습니다: ${title || existingWorkBoard.title}`,
            personalTarget: [targetManagerId],
            branchId,
          },
        });

        this.gateway.sendNewWorkBoardNotification({
          type: "NEW_WORK_BOARD",
          data: {
            workBoardId: updatedWorkBoard.id,
            alarmId: createAlarm.id,
            title: updatedWorkBoard.title,
            writer: updatedWorkBoard.writer,
            toPerson: nextToPerson,
            toTeam: nextToTeam,
            targetManagerId,
            branchId,
          },
        });
      }

      return {
        ok: true,
        message: "정상적으로 수정완료 되었습니다.",
      };
    } catch (error) {
      console.error(error.message);
      return {
        ok: false,
        message: "에러발생! 에러메세지를 확인하세요.",
        error: `Error:${error}`,
      };
    }
  }
}
