import { z } from "zod"
import { RenderSchemaToHonoForm, type ObjectSchema } from "json-schema-to-form"

export default async function FormExample() {
  return (
    <div class="form-example">
      <RenderSchemaToHonoForm
        schema={z.toJSONSchema(SchemaExample) as ObjectSchema}
        method="post"
        action="/form-demo"
        enctype="multipart/form-data"
      >
        <button
          type="submit"
          class="mt-4 rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          Submit
        </button>
      </RenderSchemaToHonoForm>

      <style
        dangerouslySetInnerHTML={{
          __html: /* css */ `
          .form-example {
            form {
              max-width: 400px;
              width: 100%;
            }
            fieldset {
              border: solid 2px rgb(0 0 0 / 0.1);
              padding: 12px;
            }
            :where(form, form fieldset > *) {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            :where(form > *, form fieldset > * > *) {
              display: flex;
              gap: 8px;
            }
            :where(form > *, form fieldset > * > *) > :first-child:not(legend) {
              min-width: 120px;
            }
            :where(form > *, form fieldset > * > *) > :last-child {
              flex: 1;
              min-width: 0;
            }
          }
          `,
        }}
      />
    </div>
  )
}

export const SchemaExample = z.object({
  url: z.url().default("https://example.net").describe("URI"),
  method: z.enum(["GET", "POST"]).default("GET").meta({
    uiWidget: "select", // or "radio"
  }),
  method2: z.enum(["GET", "POST"]).default("GET").meta({
    uiWidget: "radio",
  }),
  user: z.object({
    name: z.string().describe("First-name Last-name"),
    age: z.int().min(0).max(120).default(0).meta({
      uiWidget: "range", // or "number"
    }),
    age2: z.number().min(0).max(120).default(0).meta({
      uiWidget: "number",
    }),
    favoriteColor: z.array(z.enum(["red", "green", "blue"])).meta({
      uiWidget: "select", // or "checkbox"
    }),
    favoriteColor2: z.array(z.enum(["red", "green", "blue"])).optional(),
  }),
  bio: z
    .string()
    .meta({
      uiWidget: "textarea", // or "input"
    })
    .optional(),
})
