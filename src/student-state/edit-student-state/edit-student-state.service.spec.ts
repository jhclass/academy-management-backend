import { PrismaService } from "@src/prisma/prisma.service";
import { EditStudentStateService } from "./edit-student-state.service";
import { Test, TestingModule } from "@nestjs/testing";
import { EditStudentStateDto } from "./dto/edit-student-state.dto";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";

describe("Edit student state service", () => {
  let service: EditStudentStateService;
  let client: PrismaService;
  let gatewayService: WebSocketGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditStudentStateService,
        {
          provide: PrismaService,
          useValue: {
            studentState: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            manageUser: {
              findFirst: jest.fn(),
            },
            alarm: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: WebSocketGatewayService,
          useValue: {
            sendNewStudentStateNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EditStudentStateService);
    client = module.get(PrismaService);
    gatewayService = module.get(WebSocketGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("필수값이 없으면 에러를 반환한다", async () => {
    const context = { req: { user: { id: 1 } } };
    const result = await service.editStudentStateFunc(
      context,
      {} as EditStudentStateDto,
    );

    expect(result).toEqual({
      ok: false,
      message: "에러발생! 에러메세지를 확인하세요.",
      error: "Error:id와 lastModifiedTime은 필수값입니다.",
    });
  });

  it("존재하지 않는 id면 에러를 반환한다", async () => {
    const context = { req: { user: { id: 1 } } };
    const input: EditStudentStateDto = {
      id: 1,
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [],
    };
    (client.studentState.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.editStudentStateFunc(context, input);

    expect(result).toEqual({
      ok: false,
      message: "에러발생! 에러메세지를 확인하세요.",
      error: "Error:데이터가 존재하지 않습니다. id를 다시 확인하세요.",
    });
  });

  it("담당자 변경 없이 정상적으로 데이터를 수정한다", async () => {
    const context = {
      req: {
        user: {
          id: 1,
          branchId: 5,
          mUsername: "관리자",
        },
      },
    };
    const input: EditStudentStateDto = {
      id: 1,
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [2, 3],
    } as EditStudentStateDto;
    const existingData = {
      id: 1,
      stName: "홍길동",
      branchId: 5,
      pic: "강다영",
      currentManagerId: 1,
      adviceTypes: [{ id: 4 }, { id: 5 }],
    };
    (client.studentState.findUnique as jest.Mock).mockResolvedValue(
      existingData,
    );
    (client.studentState.update as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
    });

    const result = await service.editStudentStateFunc(context, input);

    expect(result).toEqual({
      ok: true,
      message: "정상적으로 수정 완료 되었습니다.",
    });
    expect(client.studentState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        adviceTypes: {
          disconnect: [{ id: 4 }, { id: 5 }],
          connect: [{ id: 2 }, { id: 3 }],
        },
        lastModifiedTime: "2025-02-07T10:00:00Z",
      },
    });
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewStudentStateNotification).not.toHaveBeenCalled();
  });

  it("담당자가 실제 직원으로 변경되면 알림을 생성하고 소켓을 발송한다", async () => {
    const context = {
      req: {
        user: {
          id: 1,
          branchId: 2,
          mUsername: "정수경",
        },
      },
    };
    const input: EditStudentStateDto = {
      id: 1,
      pic: "강다영",
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [],
    } as EditStudentStateDto;
    (client.studentState.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
      branchId: 2,
      pic: "정수경",
      currentManagerId: 1,
      adviceTypes: [],
    });
    (client.manageUser.findFirst as jest.Mock).mockResolvedValue({
      id: 9,
      mUsername: "강다영",
    });
    (client.studentState.update as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
    });
    (client.alarm.create as jest.Mock).mockResolvedValue({ id: 7 });

    const result = await service.editStudentStateFunc(context, input);

    expect(result.ok).toBe(true);
    expect(client.alarm.create).toHaveBeenCalledWith({
      data: {
        title: "상담 담당자 변경",
        content: "홍길동님의 상담 담당자가 강다영님으로 변경되었습니다.",
        personalTarget: [9],
        branchId: 2,
      },
    });
    expect(gatewayService.sendNewStudentStateNotification).toHaveBeenCalledWith({
      type: "NEW_STUDENTSTATE",
      data: {
        memo: true,
        studentStateId: 1,
        alarmId: 7,
        studentname: "홍길동",
        alarmTitle: "상담 담당자 변경",
        alarmContent: "홍길동님의 상담 담당자가 강다영님으로 변경되었습니다.",
        filterTargetIds: [9],
        branchId: 2,
      },
    });
  });

  it("담당자 저정필요로 변경되면 알림을 발송하지 않는다", async () => {
    const context = {
      req: {
        user: {
          id: 1,
          branchId: 2,
        },
      },
    };
    const input: EditStudentStateDto = {
      id: 1,
      pic: "담당자 저정필요",
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [],
    } as EditStudentStateDto;
    (client.studentState.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
      branchId: 2,
      pic: "강다영",
      currentManagerId: 9,
      adviceTypes: [],
    });
    (client.studentState.update as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
    });

    const result = await service.editStudentStateFunc(context, input);

    expect(result.ok).toBe(true);
    expect(client.manageUser.findFirst).not.toHaveBeenCalled();
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewStudentStateNotification).not.toHaveBeenCalled();
  });


  it("담당자 이름이 직원과 매칭되지 않아도 수정은 성공하고 알림은 발송하지 않는다", async () => {
    const context = {
      req: {
        user: {
          id: 1,
          branchId: 2,
        },
      },
    };
    const input: EditStudentStateDto = {
      id: 1,
      pic: "알수없는담당자",
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [],
    } as EditStudentStateDto;
    (client.studentState.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
      branchId: 2,
      pic: "강다영",
      currentManagerId: 9,
      adviceTypes: [],
    });
    (client.manageUser.findFirst as jest.Mock).mockResolvedValue(null);
    (client.studentState.update as jest.Mock).mockResolvedValue({
      id: 1,
      stName: "홍길동",
    });

    const result = await service.editStudentStateFunc(context, input);

    expect(result.ok).toBe(true);
    expect(client.studentState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        pic: "알수없는담당자",
        adviceTypes: {
          disconnect: [],
          connect: [],
        },
        lastModifiedTime: "2025-02-07T10:00:00Z",
      },
    });
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewStudentStateNotification).not.toHaveBeenCalled();
  });
  it("데이터베이스 에러가 발생하면 에러 메시지를 반환한다", async () => {
    const context = { req: { user: { id: 1 } } };
    const input: EditStudentStateDto = {
      id: 1,
      lastModifiedTime: "2025-02-07T10:00:00Z",
      adviceTypes: [],
    } as EditStudentStateDto;

    (client.studentState.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      adviceTypes: [],
    });
    (client.studentState.update as jest.Mock).mockRejectedValue(
      new Error("DB 업데이트 실패"),
    );

    const result = await service.editStudentStateFunc(context, input);

    expect(result).toEqual({
      ok: false,
      message: "에러발생! 에러메세지를 확인하세요.",
      error: "Error:DB 업데이트 실패",
    });
  });
});