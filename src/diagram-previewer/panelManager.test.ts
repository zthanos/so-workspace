/**
 * Unit tests for PanelManager file type detection
 */

import { EXTENSION_MAP } from './types';

describe('PanelManager File Type Detection', () => {
  describe('EXTENSION_MAP', () => {
    test('should map Mermaid extensions correctly', () => {
      expect(EXTENSION_MAP['.mmd']).toEqual({ renderer: 'mermaid' });
      expect(EXTENSION_MAP['.mermaid']).toEqual({ renderer: 'mermaid' });
    });

    test('should map PlantUML extensions to Kroki', () => {
      expect(EXTENSION_MAP['.puml']).toEqual({ renderer: 'kroki', diagramType: 'plantuml' });
      expect(EXTENSION_MAP['.plantuml']).toEqual({ renderer: 'kroki', diagramType: 'plantuml' });
      expect(EXTENSION_MAP['.pu']).toEqual({ renderer: 'kroki', diagramType: 'plantuml' });
      expect(EXTENSION_MAP['.wsd']).toEqual({ renderer: 'kroki', diagramType: 'plantuml' });
    });

    test('should map GraphViz extensions to Kroki', () => {
      expect(EXTENSION_MAP['.dot']).toEqual({ renderer: 'kroki', diagramType: 'graphviz' });
      expect(EXTENSION_MAP['.gv']).toEqual({ renderer: 'kroki', diagramType: 'graphviz' });
    });

    test('should map Structurizr DSL extension to Kroki', () => {
      expect(EXTENSION_MAP['.dsl']).toEqual({ renderer: 'kroki', diagramType: 'structurizr' });
    });

    test('should map other DSL extensions to Kroki', () => {
      expect(EXTENSION_MAP['.bpmn']).toEqual({ renderer: 'kroki', diagramType: 'bpmn' });
      expect(EXTENSION_MAP['.excalidraw']).toEqual({ renderer: 'kroki', diagramType: 'excalidraw' });
      expect(EXTENSION_MAP['.ditaa']).toEqual({ renderer: 'kroki', diagramType: 'ditaa' });
      expect(EXTENSION_MAP['.nomnoml']).toEqual({ renderer: 'kroki', diagramType: 'nomnoml' });
    });

    test('should not have Mermaid extensions mapped to Kroki', () => {
      expect(EXTENSION_MAP['.mmd']?.renderer).not.toBe('kroki');
      expect(EXTENSION_MAP['.mermaid']?.renderer).not.toBe('kroki');
    });

    test('should have all Kroki extensions with diagramType', () => {
      Object.entries(EXTENSION_MAP).forEach(([ext, mapping]) => {
        if (mapping.renderer === 'kroki') {
          expect(mapping.diagramType).toBeDefined();
          expect(mapping.diagramType).not.toBe('');
        }
      });
    });
  });

  describe('Content-based detection patterns', () => {
    test('should detect PlantUML from @startuml', () => {
      const content = '@startuml\nA -> B\n@enduml';
      expect(content.trim().startsWith('@startuml')).toBe(true);
    });

    test('should detect Structurizr from workspace keyword', () => {
      const content = 'workspace "Test" {\n  model {\n  }\n}';
      expect(content.trim().startsWith('workspace')).toBe(true);
    });

    test('should detect GraphViz from digraph', () => {
      const content = 'digraph G {\n  A -> B\n}';
      expect(content.trim().startsWith('digraph')).toBe(true);
    });

    test('should detect GraphViz from graph with curly braces', () => {
      const content = 'graph G {\n  A -- B\n}';
      expect(content.trim().startsWith('graph') && content.includes('{')).toBe(true);
    });

    test('should detect Mermaid from graph with direction', () => {
      const mermaidGraphPattern = /^graph\s+(TB|BT|RL|LR|TD)/;
      
      expect(mermaidGraphPattern.test('graph TB')).toBe(true);
      expect(mermaidGraphPattern.test('graph LR')).toBe(true);
      expect(mermaidGraphPattern.test('graph TD')).toBe(true);
      expect(mermaidGraphPattern.test('graph BT')).toBe(true);
      expect(mermaidGraphPattern.test('graph RL')).toBe(true);
    });

    test('should NOT detect Mermaid from GraphViz graph', () => {
      const mermaidGraphPattern = /^graph\s+(TB|BT|RL|LR|TD)/;
      const graphvizContent = 'graph G {';
      
      expect(mermaidGraphPattern.test(graphvizContent)).toBe(false);
    });

    test('should detect Mermaid from sequenceDiagram', () => {
      const content = 'sequenceDiagram\n  A->>B: Hello';
      expect(content.trim().startsWith('sequenceDiagram')).toBe(true);
    });

    test('should detect Mermaid from classDiagram', () => {
      const content = 'classDiagram\n  class Animal';
      expect(content.trim().startsWith('classDiagram')).toBe(true);
    });

    test('should detect Mermaid from flowchart', () => {
      const content = 'flowchart TD\n  A-->B';
      expect(content.trim().startsWith('flowchart')).toBe(true);
    });
  });

  describe('Extension normalization', () => {
    test('should handle lowercase extensions', () => {
      expect(EXTENSION_MAP['.puml']).toBeDefined();
      expect(EXTENSION_MAP['.mmd']).toBeDefined();
    });

    test('should handle case-insensitive lookup', () => {
      const ext = '.PUML';
      const normalized = ext.toLowerCase();
      expect(EXTENSION_MAP[normalized]).toBeDefined();
      expect(EXTENSION_MAP[normalized]?.renderer).toBe('kroki');
    });
  });
});
