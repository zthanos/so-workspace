declare module 'plantuml-wasm' {
  export function generateSVG(content: string): Promise<string>;
}