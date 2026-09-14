import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
@Injectable()
export class CreateStudentService {
  constructor(
    private readonly client: PrismaService,
    private readonly gateway: WebSocketGatewayService,
  ) {}
  async createStudentFunc(
    context: any,
    name?: string,
    phoneNum1?: string,
    phoneNum2?: string,
    smsAgreement?: string,
    birthday?: string,
    department?: string,
  ) {
    try {
      const { user } = context.req;
      console.log("user", user.branchId);
      if (user.branchId === null || user.branchId === undefined) {
        throw new NotFoundException("branchId가 없습니다.");
      }
      department;
      //이미등록된 학생이라면 한번 더 filtered
      const existingStudent = await this.client.student.count({
        where: {
          name,
          phoneNum1,
          branchId: user?.branchId,
        },
      });
      if (existingStudent > 0) {
        throw new ConflictException(
          "이미 등록된 학생이름과 전화번호를 가지고 있습니다.",
        );
      }
      //console.log(name, phoneNum1, phoneNum2, smsAgreement, birthday);
      const createStudentData = await this.client.student.create({
        data: {
          name,
          phoneNum1,
          phoneNum2,
          smsAgreement,
          birthday,
          writer: user?.mUsername,
          branchId: user?.branchId,
        },
      });
      if (!createStudentData) {
        throw new InternalServerErrorException(
          "정상적으로 데이터가 생성되지 않았습니다 데이터를 다시 확인하세요.",
        );
      }

      //알람등록
      //매니져 출력
      const targetManagerIds = await this.client.manageUser.findMany({
        where: {
          branchId: user?.branchId,
          PermissionsGranted: {
            some: {
              id: 12,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const filterTargetIds = targetManagerIds
        .filter((manager) => manager.id !== user?.id)
        .map((manager) => manager.id);

      const createAlarm = await this.client.alarm.create({
        data: {
          title: "수강생 등록",
          content: `새로운 수강생 ${name}님이 등록되었습니다.`,
          personalTarget: filterTargetIds,
          branchId: user?.branchId,
        },
      });
      if (!createAlarm) {
        throw new InternalServerErrorException(
          "알람이 제대로 생성되지 않았습니다.",
        );
      }

      //소켓발송
      const payload = {
        type: "NEW_STUDENT",
        data: {
          memo: Boolean(true),
          studentname: name,
          alarmTitle: "새로운 수강생 등록",
          alarmContent: `${name} 학생이 등록되었습니다.`,
          filterTargetIds,
        },
      };
      this.gateway.sendNewStudentNotification(payload);
      return {
        ok: true,
        message: ` ${name} 학생데이터가 생성되었습니다. `,
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
