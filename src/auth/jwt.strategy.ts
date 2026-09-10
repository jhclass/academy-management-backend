import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "@src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly client: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader("token"),
      ignoreExpiration: false,
      secretOrKey: process.env.SECRET_KEY,
    });
  }
  async validate(payload: any) {
    console.log("jwt_payload", payload);
    if (!payload) {
      throw new UnauthorizedException("Invalid token");
    }
    const thisUser = await this.client.manageUser.findUnique({
      where: {
        mUserId: payload.mUserId,
      },
    });
    return thisUser;
  }
}
