import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";

@Injectable()
export class CreatePermissionsGrantedService {
  constructor(private readonly client: PrismaService) {}
  async createPermissionsGrantedFunc(
    context: any,
    permissionName: string,
    topic: string,
    manageUserIds?: number[],
    smsPermitted?: string,
    readOnly?: string,
    allPermitted?: string,
  ) {
    try {
      const { user } = context.req;
      const branchId = user?.branchId;
      if (!permissionName || !topic) {
        throw new BadRequestException("Required values are missing.");
      }

      if (!Array.isArray(manageUserIds)) {
        throw new BadRequestException("manageUserIds must be an array.");
      }
      const existingIds = await this.client.manageUser.findMany({
        where: {
          id: {
            in: manageUserIds,
          },
          branchId,
        },
      });

      const foundIds = existingIds.map((user) => user.id);
      const missingIds = manageUserIds.filter(
        (id: number) => !foundIds.includes(id),
      );

      if (missingIds.length > 0) {
        throw new NotFoundException(
          `ManageUser IDs not found in this branch: ${missingIds.join(", ")}`,
        );
      }

      await this.client.permissionsGranted.create({
        data: {
          permissionName,
          topic,
          ManageUser: {
            connect: manageUserIds.map((id) => ({
              id,
            })),
          },
          smsPermitted,
          readOnly,
          allPermitted,
        },
      });
      return {
        ok: true,
        message: "Permission created successfully.",
      };
    } catch (error) {
      console.error(console.error);
      return {
        ok: false,
        message: "An error occurred.",
        error: `Error:${error.message}`,
      };
    }
  }
}