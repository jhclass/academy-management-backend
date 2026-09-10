import { Field, InputType, Int } from "@nestjs/graphql";
import { IsDateString, IsInt, IsNotEmpty, IsOptional } from "class-validator";

@InputType()
export class EditWorkBoardDto {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field({ nullable: true })
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  writer?: string;

  @Field({ nullable: true })
  @IsOptional()
  toTeam?: string;

  @Field({ nullable: true })
  @IsOptional()
  toPerson?: string;

  @Field({ nullable: true })
  @IsOptional()
  level?: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  workStatus?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  @IsOptional()
  detail?: string;

  @Field({ nullable: true })
  @IsOptional()
  filePath?: string;

  @Field({ nullable: true })
  @IsOptional()
  fileName?: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  lastModifiedTime?: Date;
}
