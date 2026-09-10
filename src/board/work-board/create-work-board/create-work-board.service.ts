import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { CreateWorkBoardDto } from "./dto/create-work-board.dto";
import { S3Service } from "@src/s3/s3.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";

@Injectable()
export class CreateWorkBoardService {
  constructor(
    private readonly client: PrismaService,
    private readonly s3Service: S3Service,
    private readonly gateway: WebSocketGatewayService,
  ) {}
  async createWorkBoardFunc(
    context: any,
    createWorkBoardDto: CreateWorkBoardDto,
  ) {
    try {
      const { user } = context.req;
      const branchId = user.branchId;
      console.log(branchId);
      const client = this.client;
      const {
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
      } = createWorkBoardDto;
      let targetManagerId: number | null = null;

      if (toPerson) {
        if (toTeam) {
          const existingManageUser = await client.manageUser.findFirst({
            where: {
              mUsername: toPerson,
              mPart: {
                has: toTeam,
              },
              branchId,
            },
            select: {
              id: true,
              mUsername: true,
            },
          });
          if (!existingManageUser) {
            throw new NotFoundException(
              "전달 받을 직원의 이름과 부서를 다시 확인하세요.",
            );
          }
          targetManagerId = existingManageUser.id;
        } else {
          throw new BadRequestException(
            "전달 받을 부서가 올바르게 입력되었는지 확인하세요.",
          );
        }
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
      const srcValues = extractSrcValues(detail);

      const urls = await this.s3Service.uploadBase64Images(
        srcValues,
        "board/editor",
      );

      const imgSrcRegex = /<img\s+[^>]*src="data:image\/[^"]+"[^>]*>/g;
      const matches = detail.match(imgSrcRegex);
      let updateDetail = detail;
      if (matches && matches.length > 0) {
        updateDetail = detail;
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

      const createdWorkBoard = await client.workBoard.create({
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
          detail: detail && updateDetail,
          branchId: user.branchId,
        },
      });

      if (targetManagerId) {
        const createAlarm = await client.alarm.create({
          data: {
            title: "업무 요청",
            content: `${writer || user?.mUsername || "작성자"}님이 ${toPerson}님에게 업무를 요청했습니다: ${title}`,
            personalTarget: [targetManagerId],
            branchId: user.branchId,
          },
        });

        this.gateway.sendNewWorkBoardNotification({
          type: "NEW_WORK_BOARD",
          data: {
            workBoardId: createdWorkBoard.id,
            alarmId: createAlarm.id,
            title,
            writer,
            toPerson,
            toTeam,
            targetManagerId,
            branchId: user.branchId,
          },
        });
      }

      return {
        ok: true,
        message: "정상적으로 생성완료 되었습니다.",
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
