#!/usr/bin/env node

import * as fs from 'fs'
import * as GraphQL from 'graphql'
import { generateRelayFragmentsInterface } from './index'

const schemaSource: string = fs.readFileSync(process.argv[2], { encoding: 'utf-8' })
const schemaJSON = JSON.parse(schemaSource)
const schema = GraphQL.buildClientSchema(schemaJSON.data || schemaJSON)

const files = process.argv.slice(3, process.argv.length)
files.forEach(file => {
  const source: string = fs.readFileSync(file, { encoding: 'utf-8' })
  console.log(file)
  console.log(generateRelayFragmentsInterface(schema, source))
  console.log('')
})
