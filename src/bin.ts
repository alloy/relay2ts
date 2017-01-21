#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as GraphQL from 'graphql'
import * as minimist from 'minimist'
import * as GraphQLConfigParser from 'graphql-config-parser'

import { GenerationResult, generateRelayFragmentsInterface, getConfig } from './index'

function banner() {
  console.log(`
Usage: ${path.basename(process.argv[1])} --schema=path/to/schema.json [...FILES]

    --schema   The path to a GraphQL schema json file. (Defaults to data/schema.json, if it exists.)
    --list     Print out the props interfaces for all FILES that contain Relay query fragments.
    --update   Updates files to add the props interface.
    --name     Name of the generated props interface. (Defaults to IRelayProps)
    --help     This text.
  `.trim())
}

function fail(message: string) {
  console.log(message)
  process.exit(1)
}

interface ARGV {
  _: string[],
  schema?: string,
  help?: boolean,
  version?: boolean,
  list?: boolean,
  update?: boolean,
  name?: string,
}

const argv: ARGV = minimist(process.argv.slice(2))

if (argv.help) {
  banner()
  process.exit(0)
}

if (argv._.length === 0) {
  banner()
  process.exit(1)
}

getConfig({ schemaPath: argv.schema })
  .then(({ schema, interfaceName }) => {
    console.log('')

    function forEachFileWithInterface(callback: (file: string, generationResult: GenerationResult) => void) {
      argv._.forEach(file => {
        const source = fs.readFileSync(file, { encoding: 'utf-8' })
        const generationResult = generateRelayFragmentsInterface(schema, source, argv.name || interfaceName)
        if (generationResult) callback(file, generationResult)
      })
    }

    if (argv.update) {
      forEachFileWithInterface((file, { existingInterfaceRange, input, propsInterface }) => {
        console.log(`\u001b[32m${file}\u001b[0m`)
        let result = null
        if (existingInterfaceRange) {
          result = [
            input.substring(0, existingInterfaceRange.start),
            propsInterface,
            input.substring(existingInterfaceRange.end, input.length)
          ].join("")
        } else {
          const hasTrailingNewLine = input.endsWith("\n")
          result = input
          if (!hasTrailingNewLine) {
            result = result + '\n'
          }
          result = result + '\n' + propsInterface
          if (hasTrailingNewLine) {
            result = result + '\n'
          }
        }
        fs.writeFileSync(file, result, { encoding: 'utf-8' })
      })
    } else {
      forEachFileWithInterface((file, { propsInterface }) => {
        console.log(`\u001b[32m${file}\u001b[0m\n${propsInterface}\n`)
      })
    }
  })
  .catch(error => {
    fail(error.message)
  })
