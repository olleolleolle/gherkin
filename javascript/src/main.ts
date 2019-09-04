import Stream = require('stream')
import * as gherkin from './index'

const args = process.argv.slice(2)
const options = {
  includeSource: true,
  includeGherkinDocument: true,
  includePickles: true,
  useLegacyImplementation: false,
}

const paths = []
while (args.length > 0) {
  const arg = args.shift()
  switch (arg) {
    case '--no-source':
      options.includeSource = false
      break

    case '--no-ast':
      options.includeGherkinDocument = false
      break

    case '--no-pickles':
      options.includePickles = false
      break

    case '--use-legacy-implementation':
      options.useLegacyImplementation = true
      break

    default:
      paths.push(arg)
  }
}

const protobufNdjsonStream = new Stream.Transform({
  objectMode: true,
  transform(message, _, callback) {
    const ob = message.constructor.toObject(message, { defaults: true })
    // This reviver omits printing fields with empty values
    // This is to make it behave the same as Golang's protobuf->JSON converter
    const json = JSON.stringify(ob, (key: string, value: any) => {
      return value === null ||
        value === '' ||
        value === 0 ||
        (Array.isArray(value) && value.length === 0)
        ? undefined
        : fixEnum(key, value)
    })
    this.push(json + '\n')
    callback()
  },
})

// Enum values are incorrectly represented in JSON as the enum value index,
// rather than the enum value string. This function works around that.
function fixEnum(key: string, value: any) {
  if (key === 'encoding') {
    return ['BASE64', 'UTF8'][value]
  }
  return value
}

gherkin
  .fromPaths(paths, options)
  .pipe(protobufNdjsonStream)
  .pipe(process.stdout)
