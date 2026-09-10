import { Args, Mutation, Resolver, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "@src/auth/gql-auth.guard";
import { CommonResponse } from "@src/common-entity/common-response.entity";
import { EditWorkBoardDto } from "./dto/edit-work-board.dto";
import { EditWorkBoardService } from "./edit-work-board.service";

@Resolver()
export class EditWorkBoardResolver {
  constructor(private readonly editWorkBoardService: EditWorkBoardService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CommonResponse)
  async editWorkBoard(
    @Context() context: any,
    @Args("editWorkBoardDto") editWorkBoardDto: EditWorkBoardDto,
  ) {
    return this.editWorkBoardService.editWorkBoardFunc(
      context,
      editWorkBoardDto,
    );
  }
}
