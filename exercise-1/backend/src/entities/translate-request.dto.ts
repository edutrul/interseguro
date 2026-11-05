import Joi from 'joi';

export type FlatValue = string | number | boolean | null;

/** The client's flat payload. Field names belong to the external contract. */
export type FlatInput = Record<string, FlatValue>;

export interface TranslateRequest extends FlatInput {
  producto: string;
  tipoEndoso: string;
}

const scalar = Joi.alternatives(Joi.string().allow(''), Joi.number(), Joi.boolean()).allow(null);

/**
 * Only the template selectors are fixed here. Every other required field is
 * defined by the template, so a new product never changes this schema.
 */
export const translateRequestSchema = Joi.object({
  producto: Joi.string().trim().required(),
  tipoEndoso: Joi.string().trim().required(),
}).pattern(Joi.string(), scalar);
