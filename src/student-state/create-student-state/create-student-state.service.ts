import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
import { CreateStudentStateDto } from "./dto/create-student-state.dto";

@Injectable()
export class CreateStudentStateService {
  constructor(
    private readonly client: PrismaService,
    private readonly gateway: WebSocketGatewayService,
  ) {}
  async createStudentStateFunc(context: any, input: CreateStudentStateDto) {
    try {
      const {
        agreement,
        progress,
        adviceTypes,
        subject,
        stName,
        phoneNum1,
        campus,
        detail,
        category,
        phoneNum2,
        phoneNum3,
        stEmail,
        stAddr,
        stVisit,
        subDiv,
        expEnrollDate,
        perchase,
        birthday,
        receiptDiv,
        pic,
        classMethod,
        branchId,
        today,
      } = input;
      const { user } = context.req;
      //const { ip } = context.req;
      //console.log("a", ip);
      //today 체크
      if (!Array.isArray(today) || today.length < 2) {
        throw new BadRequestException(
          "오늘 날짜 범위를 정의하는 배열이 필요합니다.",
        );
      }
      //현재 ipRecord 없음.
      const ipAddr =
        context?.req?.headers?.["x-forwarded-for"]?.split(",")[0] || // 프록시를 통해 전달된 실제 클라이언트 IP
        context?.req?.connection?.remoteAddress || // 네트워크 소켓에서 직접 추출한 IP
        "Unknown";
      //console.log("context?", context.req);
      //console.log(ipAddr);
      //today 체크
      if (!Array.isArray(today) || today.length < 2) {
        throw new BadRequestException(
          "오늘 날짜 범위를 정의하는 배열이 필요합니다.",
        );
      }
      //ip 체크 / 내부인원은
      if (!user) {
        if (ipAddr) {
          const checkingIp = await this.client.ipRecord.count({
            where: {
              ipRecord: ipAddr,
              createdAt: {
                gte: today[0],
                lte: today[1],
              },
            },
          });
          if (checkingIp >= 10) {
            throw new BadRequestException(
              "오늘 하루 동안 비정상적으로 많은 게시물이 생성된 ip addr 입니다.",
            );
          }
          // ip log 기록 쌓기.

          await this.client.ipRecord.create({
            data: {
              ipRecord: ipAddr,
              allowed: "Y",
              details: "상담 문의 등록",
              branchId: user?.branchId || branchId,
            },
          });
        } else {
          throw new InternalServerErrorException(
            " ip 주소를 기록할 수 없습니다.",
          );
        }
      }

      const branchName = await this.client.branch.findUnique({
        where: {
          id: user?.branchId,
        },
        select: {
          branchName: true,
        },
      });
      console.log(branchName);
      const classMethods = classMethod === null ? [] : classMethod;
      //console.log(user.branchId);
      await this.client.studentState.create({
        data: {
          agreement,
          subject,
          progress,
          stName,
          phoneNum1,
          campus: campus ?? branchName?.branchName,
          detail,
          category,
          phoneNum2,
          phoneNum3,
          stEmail,
          stAddr,
          stVisit,
          subDiv,
          expEnrollDate,
          perchase,
          birthday,
          receiptDiv,
          pic,
          classMethod: classMethods,
          branchId: branchId ?? user?.branchId,
          adviceTypes: {
            connect: adviceTypes.map((id) => ({ id })),
          },
        },
      });

      //알람등록,

      //매니져 출력
      const targetManagerIds = await this.client.manageUser.findMany({
        where: {
          branchId: user?.branchId || branchId,
          PermissionsGranted: {
            some: {
              id: 10,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const filterTargetIds = targetManagerIds.map((manager) => manager.id);

      const createAlarm = await this.client.alarm.create({
        data: {
          title: "상담신청",
          content: `${stName}님이 상담신청을 하였습니다.`,
          personalTarget: filterTargetIds,
          branchId: user?.branchId || branchId,
        },
      });
      if (!createAlarm) {
        throw new InternalServerErrorException(
          "알람이 제대로 생성되지 않았습니다.",
        );
      }

      //소켓발송
      const payload = {
        type: "NEW_STUDENTSTATE",
        data: {
          memo: true,
          studentname: stName,
          alarmTitle: "새로운 상담신청 등록",
          alarmContent: `${stName} 학생이 등록되었습니다.`,
          filterTargetIds,
        },
      };
      this.gateway.sendNewStudentStateNotification(payload); // Gateway 호출

      return {
        ok: true,
        message: `정상적으로 등록 완료 되었습니다.`,
      };
    } catch (error) {
      console.error(error.message);
      return {
        ok: false,
        message: `에러발생! 에러메세지를 확인하세요.`,
        error: `Error:${error.message}`,
      };
    }
  }
}
