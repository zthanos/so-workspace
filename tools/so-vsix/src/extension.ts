import * as vscode from "vscode";
import {
  objectivesGenerateOpenChat,
  objectivesEvalOpenChat,
  objectivesPatchOpenChat,
  objectivesRecheckOpenChat
} from "./objectives_open_chat";
import { registerPaletteBuildCommands } from "./build_open_tasks";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.obj.generate", objectivesGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.eval", objectivesEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.patch", objectivesPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.recheck", objectivesRecheckOpenChat)
  );

  registerPaletteBuildCommands(context);
}

export function deactivate() {}
// 