
import { Id } from "@escad/core";
import { Parameter } from "./Parameter";

export interface BooleanParamArgs {
  readonly defaultValue: boolean,
  readonly name?: string,
  readonly desc?: string,
}

const booleanParamId = Id.create(__filename, "@escad/parameters", "Parameter", "BooleanParam", "0");

export interface BooleanParam extends Parameter<boolean>, BooleanParamArgs {
  readonly type: typeof booleanParamId,
}

export const BooleanParam = {
  create: (args: BooleanParamArgs): BooleanParam => ({
    ...args,
    type: booleanParamId,
  }),
  id: booleanParamId,
}

export const booleanParam = BooleanParam.create;
