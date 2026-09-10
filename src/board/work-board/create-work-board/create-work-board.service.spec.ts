import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@src/prisma/prisma.service";
import { S3Service } from "@src/s3/s3.service";
import { WebSocketGatewayService } from "@src/websocket/websocket.gateway";
import { CreateWorkBoardDto } from "./dto/create-work-board.dto";
import { CreateWorkBoardService } from "./create-work-board.service";

describe("CreateWorkBoardService", () => {
  let service: CreateWorkBoardService;
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

  const input: CreateWorkBoardDto = {
    title: "업무 요청 등록",
    writer: "관리자",
    toTeam: "상담팀",
    toPerson: "홍길동",
    detail: "업무 요청 내용",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWorkBoardService,
        {
          provide: PrismaService,
          useValue: {
            manageUser: {
              findFirst: jest.fn().mockResolvedValue({
                id: 7,
                mUsername: "홍길동",
              }),
            },
            workBoard: {
              create: jest.fn().mockResolvedValue({
                id: 11,
                title: "업무 요청 등록",
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

    service = module.get<CreateWorkBoardService>(CreateWorkBoardService);
    client = module.get<PrismaService>(PrismaService);
    gatewayService = module.get<WebSocketGatewayService>(
      WebSocketGatewayService,
    );
    jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("서비스가 정상적으로 생성되어야 한다", () => {
    expect(service).toBeDefined();
  });

  it("담당자가 있으면 업무 게시글 생성 후 알림을 만들고 실시간 알림을 발송해야 한다", async () => {
    const result = await service.createWorkBoardFunc(context, input);

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
    expect(client.workBoard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "업무 요청 등록",
        writer: "관리자",
        toPerson: "홍길동",
        toTeam: "상담팀",
        detail: "업무 요청 내용",
        branchId: 5,
      }),
    });
    expect(client.alarm.create).toHaveBeenCalledWith({
      data: {
        title: "업무 요청",
        content: "관리자님이 홍길동님에게 업무를 요청했습니다: 업무 요청 등록",
        personalTarget: [7],
        branchId: 5,
      },
    });
    expect(gatewayService.sendNewWorkBoardNotification).toHaveBeenCalledWith({
      type: "NEW_WORK_BOARD",
      data: {
        workBoardId: 11,
        alarmId: 13,
        title: "업무 요청 등록",
        writer: "관리자",
        toPerson: "홍길동",
        toTeam: "상담팀",
        targetManagerId: 7,
        branchId: 5,
      },
    });
    expect(result).toEqual({
      ok: true,
      message: "정상적으로 생성완료 되었습니다.",
    });
  });

  it("담당자가 없으면 업무 게시글만 생성하고 알림은 만들지 않아야 한다", async () => {
    const result = await service.createWorkBoardFunc(context, {
      title: "담당자 없는 업무",
      writer: "관리자",
      detail: "업무 내용",
    });

    expect(client.manageUser.findFirst).not.toHaveBeenCalled();
    expect(client.workBoard.create).toHaveBeenCalled();
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewWorkBoardNotification).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("담당자를 찾을 수 없으면 업무 게시글과 알림을 만들지 않아야 한다", async () => {
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(client.manageUser, "findFirst").mockResolvedValue(null);

    const result = await service.createWorkBoardFunc(context, input);

    expect(client.workBoard.create).not.toHaveBeenCalled();
    expect(client.alarm.create).not.toHaveBeenCalled();
    expect(gatewayService.sendNewWorkBoardNotification).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("NotFoundException");
  });
});
