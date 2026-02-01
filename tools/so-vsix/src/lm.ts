import * as vscode from "vscode";

export async function getChatModel(preferred: vscode.LanguageModelChat | undefined): Promise<vscode.LanguageModelChat> {
  if (preferred) return preferred;

  // Try to select available chat models
  try {
    const models = await vscode.lm.selectChatModels({});
    
    if (!models.length) {
      throw new Error(
        "No chat models available. Please install one of the following:\n" +
        "• GitHub Copilot Chat extension\n" +
        "• Another AI model provider extension\n\n" +
        "Then reload VS Code and try again."
      );
    }
    
    return models[0];
  } catch (error: any) {
    // Provide helpful error message
    if (error.message?.includes("Endpoint not found")) {
      throw new Error(
        "Language Model API is not available. Please:\n" +
        "1. Install GitHub Copilot Chat or another model provider\n" +
        "2. Sign in to your account\n" +
        "3. Ensure the extension is enabled\n" +
        "4. Reload VS Code"
      );
    }
    throw error;
  }
}

export async function sendToModel(
  model: vscode.LanguageModelChat, 
  system: string, 
  user: string, 
  token: vscode.CancellationToken
): Promise<string> {
  // VS Code Language Model API doesn't support System messages separately
  // Combine system prompt with user message
  const combinedPrompt = `${system}\n\n${user}`;
  
  const messages = [
    vscode.LanguageModelChatMessage.User(combinedPrompt)
  ];
  
  try {
    const res = await model.sendRequest(messages, {}, token);
    
    // Collect the streaming response
    let fullText = '';
    for await (const chunk of res.text) {
      fullText += chunk;
    }
    
    return fullText.trim();
  } catch (error: any) {
    if (token.isCancellationRequested) {
      throw new Error("Request was cancelled");
    }
    
    // Provide helpful error messages
    if (error.message?.includes("Endpoint not found")) {
      throw new Error(
        "Model endpoint not available. Please check:\n" +
        "• Your model provider extension is active\n" +
        "• You're signed in to your account\n" +
        "• You have an active subscription (if required)"
      );
    }
    
    throw error;
  }
}