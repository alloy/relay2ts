import * as vscode from 'vscode'
import * as path from 'path'
import * as GraphQLConfigParser from 'graphql-config-parser'
import { GenerationResult, generateRelayFragmentsInterface } from 'relay2ts'
import * as GraphQL from 'graphql'

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('relay2ts')

  function loadConfig() {
    return new Promise((resolve, reject) => {
      try {
        const config = GraphQLConfigParser.parse(vscode.workspace.rootPath)
        if (config.file) {
          config.file = path.resolve(vscode.workspace.rootPath, config.file)
        }
        resolve(config)
      } catch(error) {
        reject(error)
      }
    })
  }

  function loadSchema(
    config: GraphQLConfigParser.Config
  ): Promise<{ config: GraphQLConfigParser.Config, schema: GraphQL.GraphQLSchema }> {
    return GraphQLConfigParser.resolveSchema(config)
      .then(schemaJSON => {
        outputChannel.appendLine(`Loaded GraphQL schema from ${config.file || config.request || config['graphql-js']}`)
        return {
          config,
          schema: GraphQL.buildClientSchema(schemaJSON.data),
        }
      })
  }

  function generatePropsInterface(): Promise<GenerationResult> {
    return loadConfig()
      .then(loadSchema)
      .then(({ config, schema }) => {
        const source = vscode.window.activeTextEditor.document.getText()
        const interfaceName = config.relay2ts && config.relay2ts.interfaceName
        return generateRelayFragmentsInterface(schema, source, interfaceName)
      })
  }

  function reportError(error: Error) {
    outputChannel.appendLine(error.message)
    outputChannel.appendLine(error.stack)
    vscode.window.showErrorMessage(error.message)
  }

  context.subscriptions.push(vscode.commands.registerCommand('extension.printPropsInterface', () => {
    generatePropsInterface()
      .then(generationResult => {
        if (generationResult) {
          vscode.window.activeTextEditor.edit(editor => {
            if (generationResult.existingInterfaceRange) {
              const range = new vscode.Range(
                vscode.window.activeTextEditor.document.positionAt(generationResult.existingInterfaceRange.start),
                vscode.window.activeTextEditor.document.positionAt(generationResult.existingInterfaceRange.end),
              )
              editor.replace(range, generationResult.propsInterface)
            } else {
              const trailingNewLines = generationResult.input.match(/(\n*)$/)
              const numberOfNewLines = trailingNewLines && trailingNewLines[1].length
              const requiredNewLines = (numberOfNewLines && numberOfNewLines <= 2 && (2 - numberOfNewLines)) || 0
              let append = `${'\n'.repeat(requiredNewLines)}${generationResult.propsInterface}`
              const end = vscode.window.activeTextEditor.document.positionAt(generationResult.input.length)
              editor.insert(end, append)
            }
          })
        }
      })
      .catch(reportError)
  }))

  context.subscriptions.push(vscode.commands.registerCommand('extension.printPropsInterfaceAtCursor', () => {
    generatePropsInterface()
      .then(generationResult => {
        if (generationResult) {
          vscode.window.activeTextEditor.edit(editor => {
            editor.insert(vscode.window.activeTextEditor.selection.active, generationResult.propsInterface)
          })
        }
      })
      .catch(reportError)
  }))
}

export function deactivate() {
}
