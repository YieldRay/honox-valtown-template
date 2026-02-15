import { createRoute } from 'honox/factory'
import { Ajv2020 as Ajv } from 'ajv/dist/2020.js'
import { normalizeFormData, type ObjectSchema } from 'json-schema-to-form'
import { z } from 'zod'
import { SchemaExample } from './-components/form-example.tsx'

/** DELETE_ME */
export const POST = createRoute(async (c) => {
  const formData = await c.req.formData()
  const input = normalizeFormData(formData)
  const { valid, errors, output } = validateJSON(
    z.toJSONSchema(SchemaExample) as ObjectSchema,
    input,
  )

  return c.json({
    valid,
    errors,
    output,
    input,
  })
})

function validateJSON<T extends { type: 'object' }>(
  schema: T,
  input: Record<string, any>,
) {
  const validate = new Ajv({
    coerceTypes: 'array',
    strictSchema: false,
  }).compile(schema)

  const output = JSON.parse(JSON.stringify(input))
  const valid = validate(output)

  return {
    valid,
    errors: validate.errors,
    output,
  }
}

function validateFormData<T extends { type: 'object' }>(
  schema: T,
  formData: FormData,
) {
  const data = normalizeFormData(formData)
  return validateJSON(schema, data)
}
