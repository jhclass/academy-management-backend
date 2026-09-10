import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@src/prisma/prisma.service";
import { S3Service } from "@src/s3/s3.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
import { EditWorkBoardDto } from "./dto/edit-work-board.dto";
import { EditWorkBoardService } from "./edit-work-board.service";

describe("EditWorkBoardService", () => {
  let service: EditWorkBoardService;
  let client: PrismaService;
  let gatewayService: WebSocketGatewayService;

  const context = {
    req: {
      user: {
        id: 1,
        mUsername: "관리자",
        branchId: 5,
      },
    },
  };

  const input: EditWorkBoardDto = {
    id: 11,
    title: "수정된 업무 요청",
    writer: "관리자",
    toTeam: "상담팀",
    toPerson: "홍길동",
    detail: "수정된 업무 내용",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditWorkBoardService,
        {
          provide: PrismaService,
          useValue: {
            workBoard: {
              findUnique: jest.fn().mockResolvedValue({
                id: 11,
                title: "기존 업무",
                writer: "관리자",
                toPerson: null,
                toTeam: null,
                branchId: 5,
              }),
              update: jest.fn().mockResolvedValue({
                id: 11,
                title: "수정된 업무 요청",
                writer: "관리자",
              }),
            },
            manageUser: {
              findFirst: jest.fn().mockResolvedValue({
                id: 7,
                mUsername: "홍길동",
              }),
            },
            alarm: {
              create: jest.fn().mockResolvedValue({
                id: 13,
              }),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadBase64Images: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: WebSocketGatewayService,
          useValue: {
            sendNewWorkBoardNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditWorkBoardService>(EditWorkBoardService);
    client = module.get<PrismaService>(PrismaService);
    gatewayService = module.get<WebSocketGatewayService>(
      WebSocketGatewayService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("서비스가 정상적으로 생성되어야 한다", () => {
    expect(service).toBeDefined();
  });

  it("수정으로 담당자가 새로 지정되면 알림을 만들고 실시간 알림을 발송해야 한다", async () => {
    const result = await service.editWorkBoardFunc(context, input);

    expect(client.manageUser.findFirst).toHaveBeenCalledWith({
      where: {
        mUsername: "홍길동",
        mPart: {
          has: "상담팀",
        },
        branchId: 5,
      },
      select: {
        id: true,
        mUsername: true,
      },
    });
    expect(client.workBoard.update).toHaveBeenCalledWith({
      where: {
        id: 11,
      },
      data: expect.objectContaining({
        title: "수정된 업무 요청",
        writer: "관리자",
        toPerson: "홍길동",
        toTeam: "상담팀",
        detail: "수정된 업무 내용",
      }),
    });
    expect(client.alarm.create).toHaveBeenCalledWith({
      data: {
        title: "업무 요청",
        content: "관리자님이 홍길동님에게 업무를 요청했습니다: 수정된 업무 요청",
        personalTarget: [7],
        branchId: 5,
      },
    });
    expect(gatewayService.sendNewWorkBoardNotification).toHaveBeenCalledWith({
      type: "NEW_WORK_BOARD",
      data: {
        workBoardId: 11,
        alarmId: 13,
        title: "수정된 업무 요청",
        writer: "관리자",
        toPerson: "홍길동",
        toTeam: "상담팀",
        targetManagerId: 7,
        branchId: 5,
      },
    });
    expect(result).toEqual({
      ok: true,
      message: "정상적으로 수정완료 되었습니다.",
    });
  });

  it("담당자가 변경되지 않으면 알림을 다시 만들지 않아야 한다", async () => {
    (client.workBoard.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      title: "기존 업무",
      writer: "관리자",
      toPerson: "홍길동",
      toTeam: "상담팀",
      branchId: 5,
    });

    const result = await service.editWorkBoardFunc(context, input);

    expect(client.manageUser.findFirst).not.toHaveBeenCalled();
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewWorkBoardNotification).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
