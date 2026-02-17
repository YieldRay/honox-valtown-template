import { z } from 'zod'
import { RenderSchemaToHonoForm, type ObjectSchema } from 'json-schema-to-form'
import cssText from './form-example.css?raw'

export const SchemaExample = z.object({
  url: z.url().default('https://example.net').describe('URI'),
  method: z.enum(['GET', 'POST']).default('GET').meta({
    uiWidget: 'select', // or "radio"
  }),
  method2: z.enum(['GET', 'POST']).default('GET').meta({
    uiWidget: 'radio',
  }),
  user: z.object({
    name: z.string().describe('First-name Last-name'),
    age: z.int().min(0).max(120).default(0).meta({
      uiWidget: 'range', // or "number"
    }),
    age2: z.number().min(0).max(120).default(0).meta({
      uiWidget: 'number',
    }),
    favoriteColor: z.array(z.enum(['red', 'green', 'blue'])).meta({
      uiWidget: 'select', // or "checkbox"
    }),
    favoriteColor2: z.array(z.enum(['red', 'green', 'blue'])).optional(),
  }),
  bio: z
    .string()
    .meta({
      uiWidget: 'textarea', // or "input"
    })
    .optional(),
})

export default async function FormExample({
  class: className = '',
}: {
  class?: string
}) {
  return (
    <>
      <RenderSchemaToHonoForm
        class={`${className} form-example`}
        schema={z.toJSONSchema(SchemaExample) as ObjectSchema}
        method="post"
        action="/post-form-demo"
        enctype="multipart/form-data"
      >
        <button
          type="submit"
          class="mt-4 p-4 rounded-md text-sky-800 bg-sky-50 border border-sky-300 hover:bg-sky-100 hover:text-sky-600"
        >
          Submit
        </button>
      </RenderSchemaToHonoForm>

      <style dangerouslySetInnerHTML={{ __html: cssText }} />
    </>
  )
}
