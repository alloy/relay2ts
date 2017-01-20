import * as vscode from 'vscode'
import * as path from 'path'
import * as GraphQLConfigParser from 'graphql-config-parser'
import { generateRelayFragmentsInterface } from 'relay2ts'
import * as GraphQL from 'graphql'

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    try {
      const config = GraphQLConfigParser.parse(vscode.workspace.rootPath)
      if (config.file) {
        config.file = path.resolve(vscode.workspace.rootPath, config.file)
      }
      GraphQLConfigParser.resolveSchema(config)
        .then(schemaJSON => {
          const schema = GraphQL.buildClientSchema(schemaJSON.data)
          const source = vscode.window.activeTextEditor.document.getText()
          const interfaceName = config.relay2ts && config.relay2ts.interfaceName
          const generationResult = generateRelayFragmentsInterface(schema, source, interfaceName)
          if (generationResult) {
            vscode.window.activeTextEditor.edit(editor => {
              editor.insert(vscode.window.activeTextEditor.selection.active, generationResult.propsInterface)
            })
          }
        })
        .catch(error => {
          console.error(error)
          vscode.window.showErrorMessage(error.message)
        })
    } catch(error) {
      vscode.window.showErrorMessage(error.message)
    }
  });

  context.subscriptions.push(disposable)
}

export function deactivate() {
}
