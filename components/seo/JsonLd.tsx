type JsonLdValue = Record<string, unknown> | readonly Record<string, unknown>[]

export function serializeJsonLd(data: JsonLdValue) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
