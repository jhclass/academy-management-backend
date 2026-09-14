import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
import { EditStudentStateDto } from "./dto/edit-student-state.dto";

const UNASSIGNED_MANAGER = "담당자 저정필요";

@Injectable()
export class EditStudentStateService {
  constructor(
    private readonly client: PrismaService,
    private readonly gateway: WebSocketGatewayService,
  ) {}

  async editStudentStateFunc(context: any, input: EditStudentStateDto) {
    try {
      const { user } = context.req;
      const {
        id,
        campus,
        category,
        stName,
        phoneNum1,
        phoneNum2,
        phoneNum3,
        subject,
        detail,
        progress,
        stEmail,
        stAddr,
        subDiv,
        stVisit,
        expEnrollDate,
        perchase,
        birthday,
        pic,
        receiptDiv,
        adviceTypes,
        lastModifiedTime,
      } = input;

      if (!id || !lastModifiedTime) {
        throw new BadRequestException(
          "id와 lastModifiedTime은 필수값입니다.",
        );
      }

      const existingData = await this.client.studentState.findUnique({
        where: { id },
        include: { adviceTypes: true },
      });

      if (!existingData) {
        throw new NotFoundException(
          "데이터가 존재하지 않습니다. id를 다시 확인하세요.",
        );
      }

      const assigneeChanged = pic !== undefined && pic !== existingData.pic;
      const hasAssignedManager = Boolean(pic && pic !== UNASSIGNED_MANAGER);
      const targetManager = hasAssignedManager
        ? await this.client.manageUser.findFirst({
            where: {
              mUsername: pic,
              branchId: user?.branchId || existingData.branchId,
            },
            select: {
              id: true,
              mUsername: true,
            },
          })
        : null;

      const managerRelationData =
        pic === undefined
          ? {}
          : targetManager
            ? { currentManager: { connect: { id: targetManager.id } } }
            : pic === UNASSIGNED_MANAGER
              ? { currentManager: { disconnect: true } }
              : {};

      const updatedStudentState = await this.client.studentState.update({
        where: { id },
        data: {
          campus,
          stName,
          phoneNum1,
          phoneNum2,
          phoneNum3,
          category,
          subject,
          detail,
          progress,
          stEmail,
          stAddr,
          subDiv,
          stVisit,
          expEnrollDate,
          perchase,
          birthday,
          pic,
          receiptDiv,
          ...managerRelationData,
          adviceTypes: {
            disconnect: existingData.adviceTypes.map((type) => ({
              id: type.id,
            })),
            connect: (adviceTypes || []).map((id) => ({ id })),
          },
          lastModifiedTime,
        },
      });

      if (assigneeChanged && targetManager) {
        const studentName =
          updatedStudentState.stName || stName || existingData.stName;
        const alarmContent = `${studentName}님의 상담 담당자가 ${targetManager.mUsername}님으로 변경되었습니다.`;
        const createAlarm = await this.client.alarm.create({
          data: {
            title: "상담 담당자 변경",
            content: alarmContent,
            personalTarget: [targetManager.id],
            branchId: user?.branchId || existingData.branchId,
          },
        });

        this.gateway.sendNewStudentStateNotification({
          type: "NEW_STUDENTSTATE",
          data: {
            memo: true,
            studentStateId: updatedStudentState.id,
            alarmId: createAlarm.id,
            studentname: studentName,
            alarmTitle: "상담 담당자 변경",
            alarmContent,
            filterTargetIds: [targetManager.id],
            branchId: user?.branchId || existingData.branchId,
          },
        });
      }

      return {
        ok: true,
        message: "정상적으로 수정 완료 되었습니다.",
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        message: "에러발생! 에러메세지를 확인하세요.",
        error: `Error:${error.message}`,
      };
    }
  }
}