import * as vscode from "vscode";
import {
  objectivesGenerateOpenChat,
  objectivesEvalOpenChat,
  objectivesPatchOpenChat,
  objectivesRecheckOpenChat
} from "./objectives_open_chat";
import {
  reqInventoryGenerateOpenChat,
  reqInventoryEvalOpenChat,
  reqInventoryPatchOpenChat,
  reqInventoryRecheckOpenChat
} from "./requirements_open_chat";
import {
  diagramEvalOpenChat,
  diagramPatchOpenChat,
  diagramRecheckOpenChat
} from "./diagrams_open_chat";
import {
  soGenerateOpenChat,
  soEvalOpenChat,
  soPatchOpenChat,
  soFinalReviewOpenChat
} from "./solution_outline_open_chat";
import { registerPaletteBuildCommands } from "./build_open_tasks";
import { CommandHandlerImpl } from "./diagram_renderer_v2";
import { registerWordToMarkdownCommand } from "./word_to_markdown";
import { registerResetGeneratedFilesCommand } from "./reset_generated_files";

export function activate(context: vscode.ExtensionContext) {
  // Objectives
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.obj.generate", objectivesGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.eval", objectivesEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.patch", objectivesPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.obj.recheck", objectivesRecheckOpenChat)
  );

  // Requirements Inventory (derived from BRD)
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.req.generate", reqInventoryGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.req.eval", reqInventoryEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.req.patch", reqInventoryPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.req.recheck", reqInventoryRecheckOpenChat)
  );

  // Diagrams (evaluate/patch per selected diagram)
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.diagram.eval", diagramEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.patch", diagramPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.diagram.recheck", diagramRecheckOpenChat)
  );

  // Solution Outline
  context.subscriptions.push(
    vscode.commands.registerCommand("so-workspace.so.generate", soGenerateOpenChat),
    vscode.commands.registerCommand("so-workspace.so.eval", soEvalOpenChat),
    vscode.commands.registerCommand("so-workspace.so.patch", soPatchOpenChat),
    vscode.commands.registerCommand("so-workspace.so.finalReview", soFinalReviewOpenChat)
  );

  // Diagram rendering with plantuml-wasm (V2 implementation)
  const diagramCommandHandler = new CommandHandlerImpl();
  diagramCommandHandler.register(context);

  // Docker build tasks
  registerPaletteBuildCommands(context);

  // Word to Markdown conversion
  registerWordToMarkdownCommand(context);

  // Reset generated files command
  registerResetGeneratedFilesCommand(context);
}

export function deactivate() {}
