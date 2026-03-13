import * as vscode from "vscode";
import {
  SkillOperation,
  loadSkillConfig,
  resolveQuickPick,
  resolveInputs,
} from "./skill-loader";

// ---------------------------------------------------------------------------
// Core executor
// ---------------------------------------------------------------------------

async function openParticipantCommand(
  participant: string,
  command: string,
  text?: string
): Promise<void> {
  const query = text
    ? `@${participant} /${command} ${text}`
    : `@${participant} /${command}`;
  await vscode.commands.executeCommand("workbench.action.chat.open", { query });
}

/**
 * Generic skill executor — fully driven by the skill's skill.md frontmatter.
 *
 * @param skillFolder  Folder name under the skills directory (e.g. "diagrams")
 * @param operation    Operation name (generate | eval | patch | recheck | ...)
 * @param extraParams  Optional static params prepended to the command
 *                     (e.g. "diagram_id: c4_context" for hardcoded generate variants)
 */
export async function executeSkillOperation(
  skillFolder: string,
  operation: SkillOperation,
  extraParams?: string
): Promise<void> {
  const config = await loadSkillConfig(skillFolder);
  const parts: string[] = [];

  if (extraParams) parts.push(extraParams);

  // QuickPick — resolved per operation from skill.md quickPick.forOperations
  const qpParam = await resolveQuickPick(config, operation);
  if (qpParam === null) return; // cancelled
  if (qpParam) parts.push(qpParam);

  // Text inputs — resolved per operation from skill.md inputs[*].forOperations
  const inputParams = await resolveInputs(config, operation);
  if (inputParams === null) return; // cancelled
  if (inputParams) parts.push(inputParams);

  await openParticipantCommand(
    config.participant,
    operation,
    parts.length ? parts.join(" ") : undefined
  );
}

// ---------------------------------------------------------------------------
// Requirements Inventory
// ---------------------------------------------------------------------------

export const reqInventoryGenerateOpenChat  = () => executeSkillOperation("requirements-inventory", "generate");
export const reqInventoryEvalOpenChat      = () => executeSkillOperation("requirements-inventory", "eval");
export const reqInventoryPatchOpenChat     = () => executeSkillOperation("requirements-inventory", "patch");
export const reqInventoryRecheckOpenChat   = () => executeSkillOperation("requirements-inventory", "recheck");

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export const objectivesGenerateOpenChat  = () => executeSkillOperation("objectives", "generate");
export const objectivesEvalOpenChat      = () => executeSkillOperation("objectives", "eval");
export const objectivesPatchOpenChat     = () => executeSkillOperation("objectives", "patch");
export const objectivesRecheckOpenChat   = () => executeSkillOperation("objectives", "recheck");

// ---------------------------------------------------------------------------
// Diagrams  (generate variants bypass QuickPick — diagram_id is statically known)
// ---------------------------------------------------------------------------

export const diagramGenerateC4ContextOpenChat   = () => executeSkillOperation("diagrams", "generate", "diagram_id: c4_context");
export const diagramGenerateC4ContainerOpenChat = () => executeSkillOperation("diagrams", "generate", "diagram_id: c4_container");
export const diagramEvalOpenChat                = () => executeSkillOperation("diagrams", "eval");
export const diagramPatchOpenChat               = () => executeSkillOperation("diagrams", "patch");
export const diagramRecheckOpenChat             = () => executeSkillOperation("diagrams", "recheck");

// ---------------------------------------------------------------------------
// Solution Outline
// ---------------------------------------------------------------------------

export const solutionOutlineGenerateOpenChat  = () => executeSkillOperation("solution-outline", "generate");
export const solutionOutlineEvalOpenChat      = () => executeSkillOperation("solution-outline", "eval");
export const solutionOutlinePatchOpenChat     = () => executeSkillOperation("solution-outline", "patch");
export const solutionOutlineRecheckOpenChat   = () => executeSkillOperation("solution-outline", "recheck");

// ---------------------------------------------------------------------------
// ADR
// ---------------------------------------------------------------------------

export const adrGenerateOpenChat  = () => executeSkillOperation("architecture-decision-records", "generate");
export const adrEvalOpenChat      = () => executeSkillOperation("architecture-decision-records", "eval");
export const adrPatchOpenChat     = () => executeSkillOperation("architecture-decision-records", "patch");
export const adrRecheckOpenChat   = () => executeSkillOperation("architecture-decision-records", "recheck");