import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@src/prisma/prisma.service";
import { validateIdExists } from "@src/utils/shared.utils";

@Injectable()
export class EditPermissionsGrantedService {
  constructor(private readonly client: PrismaService) {}
  async editPermissionsGrantedFunc(
    context: any,
    lastModifiedTime: string,
    id: number,
    manageUserIdsToConnect?: number[],
    manageUserIdsToDisconnect?: number[],
    smsPermitted?: string,
    readOnly?: string,
    allPermitted?: string,
    permissionName?: string,
    topic?: string,
  ) {
    try {
      const { user } = context.req;
      const branchId = user?.branchId;
      const existingId = await this.client.permissionsGranted.findUnique({
        where: { id },
      });
      validateIdExists(existingId);

      manageUserIdsToConnect = manageUserIdsToConnect || [];
      manageUserIdsToDisconnect = manageUserIdsToDisconnect || [];
      const manageUserIds = [
        ...manageUserIdsToConnect,
        ...manageUserIdsToDisconnect,
      ];

      if (manageUserIds.length > 0) {
        const existingManageUsers = await this.client.manageUser.findMany({
          where: {
            id: {
              in: manageUserIds,
            },
            branchId,
          },
          select: {
            id: true,
          },
        });
        const foundIds = existingManageUsers.map((user) => user.id);
        const missingIds = manageUserIds.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
          throw new NotFoundException(
            `ManageUser IDs not found in this branch: ${missingIds.join(", ")}`,
          );
        }
      }

      await this.client.permissionsGranted.update({
        where: { id },
        data: {
          permissionName,
          topic,
          smsPermitted,
          readOnly,
          allPermitted,
          ManageUser: {
            disconnect: manageUserIdsToDisconnect.map((id) => ({
              id,
            })),
            connect: manageUserIdsToConnect.map((id) => ({
              id,
            })),
          },
          lastModifiedTime,
        },
      });
      return { ok: true, message: "Permission updated successfully." };
    } catch (error) {
      console.error(error.message);
      return {
        ok: false,
        message: "An error occurred.",
        error: `Error:${error.message}`,
      };
    }
  }
}