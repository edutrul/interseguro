export interface InvalidField {
  field: string;
  expected: string;
}

export class TemplateNotFoundError extends Error {
  constructor(productCode: string, endorsementType: string) {
    super(`No active template for product '${productCode}' and endorsement type '${endorsementType}'`);
  }
}

export class InvalidTemplateError extends Error {
  constructor(
    readonly productCode: string,
    readonly endorsementType: string,
    readonly version: number,
    readonly issues: string[],
  ) {
    super(`Template ${productCode}/${endorsementType} v${version} is invalid`);
  }
}

export class InputValidationError extends Error {
  constructor(
    readonly missingFields: string[],
    readonly invalidFields: InvalidField[],
  ) {
    super('The request does not satisfy the configured template');
  }
}
