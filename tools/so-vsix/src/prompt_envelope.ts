export function wrapForAgent(finalPrompt: string): string {
  return [
    "You are running a repository workflow in VS Code Agent mode.",
    "Rules:",
    "- Follow the instructions exactly.",
    "- Read required workspace files.",
    "- Write outputs to the specified paths in the repo.",
    "- Do not ask questions unless the prompt explicitly requires it.",
    "- Do not introduce changes outside the scope of the command.",
    "",
    finalPrompt
  ].join("\n");
}
