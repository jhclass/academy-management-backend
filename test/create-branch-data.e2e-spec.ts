/// <reference types="jest" />
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@src/prisma/prisma.service";
import { CreateBranchService } from "../src/branch/create-branch/create-branch.service";
import { generateRandomFourDigitNumber } from "@src/utils/shared.utils";

jest.mock("@src/utils/shared.utils", () => ({
  generateRandomFourDigitNumber: jest.fn(),
}));

describe("CreateBranchService 지점 데이터 생성", () => {
  let service: CreateBranchService;
  let prisma: {
    branch: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      branch: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 1,
          branchName: "gangnam_1234",
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBranchService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CreateBranchService>(CreateBranchService);
    (generateRandomFourDigitNumber as jest.Mock).mockReturnValue(1234);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("생성된 지점명으로 지점 데이터를 생성한다", async () => {
    const result = await service.createBranchServiceFunc("gangnam");

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: {
        branchName: "gangnam_1234",
      },
    });
    expect(prisma.branch.create).toHaveBeenCalledWith({
      data: {
        branchName: "gangnam_1234",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("생성된 지점명이 이미 존재하면 데이터를 생성하지 않는다", async () => {
    jest.spyOn(console, "error").mockImplementation();
    prisma.branch.findFirst.mockResolvedValue({
      id: 1,
      branchName: "gangnam_1234",
    });

    const result = await service.createBranchServiceFunc("gangnam");

    expect(prisma.branch.create).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Error:");
  });
});
