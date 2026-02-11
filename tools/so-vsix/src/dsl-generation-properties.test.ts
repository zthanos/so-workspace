/**
 * Property-Based Tests for DSL Generation
 * 
 * These tests validate correctness properties for Structurizr DSL generation
 * using property-based testing with fast-check.
 * 
 * Feature: c4-structurizr-migration
 */
import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

// Helper types for DSL generation
interface Actor {
  identifier: string;
  name: string;
  description: string;
}

interface System {
  identifier: string;
  name: string;
  description: string;
  external: boolean;
}

interface Container {
  identifier: string;
  name: string;
  description: string;
  technology: string;
}

interface Relationship {
  source: string;
  destination: string;
  description: string;
  technology?: string;
}

interface DSLModel {
  actors: Actor[];
  systems: System[];
  containers: Container[];
  relationships: Relationship[];
}

// Helper function to generate DSL from model
function generateContextDSL(model: DSLModel, workspaceName: string, workspaceDesc: string): string {
  let dsl = `workspace "${workspaceName}" "${workspaceDesc}" {\n    \n    model {\n`;
  
  // Add actors (people)
  for (const actor of model.actors) {
    dsl += `        ${actor.identifier} = person "${actor.name}" "${actor.description}"\n`;
  }
  
  if (model.actors.length > 0 && model.systems.length > 0) {
    dsl += `        \n`;
  }
  
  // Add systems
  for (const system of model.systems) {
    if (system.external) {
      dsl += `        ${system.identifier} = softwareSystem "${system.name}" "${system.description}" {\n`;
      dsl += `            tags "External"\n`;
      dsl += `        }\n`;
    } else {
      dsl += `        ${system.identifier} = softwareSystem "${system.name}" "${system.description}"\n`;
    }
  }
  
  if ((model.actors.length > 0 || model.systems.length > 0) && model.relationships.length > 0) {
    dsl += `        \n`;
  }
  
  // Add relationships
  for (const rel of model.relationships) {
    if (rel.technology) {
      dsl += `        ${rel.source} -> ${rel.destination} "${rel.description}" "${rel.technology}"\n`;
    } else {
      dsl += `        ${rel.source} -> ${rel.destination} "${rel.description}"\n`;
    }
  }
  
  dsl += `    }\n    \n    views {\n`;
  
  // Add systemContext view for the first non-external system
  const mainSystem = model.systems.find(s => !s.external);
  if (mainSystem) {
    dsl += `        systemContext ${mainSystem.identifier} "SystemContext" {\n`;
    dsl += `            include *\n`;
    dsl += `            autoLayout\n`;
    dsl += `        }\n`;
  }
  
  dsl += `    }\n}\n`;
  
  return dsl;
}

function generateContainerDSL(model: DSLModel, workspaceName: string, workspaceDesc: string): string {
  let dsl = `workspace "${workspaceName}" "${workspaceDesc}" {\n    \n    model {\n`;
  
  // Add actors
  for (const actor of model.actors) {
    dsl += `        ${actor.identifier} = person "${actor.name}" "${actor.description}"\n`;
  }
  
  if (model.actors.length > 0 && model.systems.length > 0) {
    dsl += `        \n`;
  }
  
  // Add main system with containers
  const mainSystem = model.systems.find(s => !s.external);
  if (mainSystem) {
    dsl += `        ${mainSystem.identifier} = softwareSystem "${mainSystem.name}" "${mainSystem.description}" {\n`;
    
    for (const container of model.containers) {
      dsl += `            ${container.identifier} = container "${container.name}" "${container.description}" "${container.technology}"\n`;
    }
    
    dsl += `        }\n`;
  }
  
  if (model.systems.length > 0) {
    dsl += `        \n`;
  }
  
  // Add external systems
  for (const system of model.systems.filter(s => s.external)) {
    dsl += `        ${system.identifier} = softwareSystem "${system.name}" "${system.description}" {\n`;
    dsl += `            tags "External"\n`;
    dsl += `        }\n`;
  }
  
  if ((model.actors.length > 0 || model.systems.length > 0) && model.relationships.length > 0) {
    dsl += `        \n`;
  }
  
  // Add relationships
  for (const rel of model.relationships) {
    if (rel.technology) {
      dsl += `        ${rel.source} -> ${rel.destination} "${rel.description}" "${rel.technology}"\n`;
    } else {
      dsl += `        ${rel.source} -> ${rel.destination} "${rel.description}"\n`;
    }
  }
  
  dsl += `    }\n    \n    views {\n`;
  
  // Add container view
  if (mainSystem) {
    dsl += `        container ${mainSystem.identifier} "Container" {\n`;
    dsl += `            include *\n`;
    dsl += `            autoLayout\n`;
    dsl += `        }\n`;
  }
  
  dsl += `    }\n}\n`;
  
  return dsl;
}

// Arbitraries (generators) for property-based testing
const camelCaseIdentifierArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-z][a-zA-Z0-9]*$/.test(s))
  .map(s => s.charAt(0).toLowerCase() + s.slice(1));

const nameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const descriptionArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const technologyArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0 && !s.includes('"'));

const actorArb = fc.record({
  identifier: camelCaseIdentifierArb,
  name: nameArb,
  description: descriptionArb
});

const systemArb = fc.record({
  identifier: camelCaseIdentifierArb,
  name: nameArb,
  description: descriptionArb,
  external: fc.boolean()
});

const containerArb = fc.record({
  identifier: camelCaseIdentifierArb,
  name: nameArb,
  description: descriptionArb,
  technology: technologyArb
});

// Feature: c4-structurizr-migration, Property 4: Actor Definition as Person Elements
describe('Property 4: Actor Definition as Person Elements', () => {
  it('should define all actors as person elements in the generated DSL model', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 5 }),
        nameArb,
        descriptionArb,
        (actors, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems: [],
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify each actor is defined as a person element
          for (const actor of actors) {
            const personPattern = new RegExp(`${actor.identifier}\\s*=\\s*person\\s+"[^"]*"\\s+"[^"]*"`);
            expect(dsl).toMatch(personPattern);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 5: External System Tagging
describe('Property 5: External System Tagging', () => {
  it('should apply "External" tag to all external systems', () => {
    fc.assert(
      fc.property(
        fc.array(systemArb, { minLength: 1, maxLength: 5 }),
        nameArb,
        descriptionArb,
        (systems, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors: [],
            systems,
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify external systems have the External tag
          for (const system of systems.filter(s => s.external)) {
            const lines = dsl.split('\n');
            let foundSystem = false;
            let foundTag = false;
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(`${system.identifier} = softwareSystem`)) {
                foundSystem = true;
                // Check next few lines for the tag
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                  if (lines[j].includes('tags "External"')) {
                    foundTag = true;
                    break;
                  }
                }
                break;
              }
            }
            
            expect(foundSystem).toBe(true);
            expect(foundTag).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 6: Appropriate View Presence
describe('Property 6: Appropriate View Presence', () => {
  it('should contain systemContext view for Context diagrams', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 3 }),
        fc.array(systemArb.map(s => ({ ...s, external: false })), { minLength: 1, maxLength: 2 }),
        nameArb,
        descriptionArb,
        (actors, systems, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems,
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify systemContext view is present
          expect(dsl).toMatch(/systemContext\s+\w+\s+"SystemContext"/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should contain container view for Container diagrams', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 3 }),
        systemArb.map(s => ({ ...s, external: false })),
        fc.array(containerArb, { minLength: 1, maxLength: 5 }),
        nameArb,
        descriptionArb,
        (actors, mainSystem, containers, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems: [mainSystem],
            containers,
            relationships: []
          };
          
          const dsl = generateContainerDSL(model, workspaceName, workspaceDesc);
          
          // Verify container view is present
          expect(dsl).toMatch(/container\s+\w+\s+"Container"/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 7: View Completeness
describe('Property 7: View Completeness', () => {
  it('should include "include *" directive in systemContext views', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 3 }),
        systemArb.map(s => ({ ...s, external: false })),
        nameArb,
        descriptionArb,
        (actors, mainSystem, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems: [mainSystem],
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify include * is present in the view
          const viewMatch = dsl.match(/systemContext[^}]*include \*/s);
          expect(viewMatch).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include "include *" directive in container views', () => {
    fc.assert(
      fc.property(
        systemArb.map(s => ({ ...s, external: false })),
        fc.array(containerArb, { minLength: 1, maxLength: 5 }),
        nameArb,
        descriptionArb,
        (mainSystem, containers, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors: [],
            systems: [mainSystem],
            containers,
            relationships: []
          };
          
          const dsl = generateContainerDSL(model, workspaceName, workspaceDesc);
          
          // Verify include * is present in the view
          const viewMatch = dsl.match(/container[^}]*include \*/s);
          expect(viewMatch).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 8: Container Technology Specification
describe('Property 8: Container Technology Specification', () => {
  it('should specify technology for each container element', () => {
    fc.assert(
      fc.property(
        systemArb.map(s => ({ ...s, external: false })),
        fc.array(containerArb, { minLength: 1, maxLength: 5 }),
        nameArb,
        descriptionArb,
        (mainSystem, containers, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors: [],
            systems: [mainSystem],
            containers,
            relationships: []
          };
          
          const dsl = generateContainerDSL(model, workspaceName, workspaceDesc);
          
          // Verify each container has technology specified (4th parameter)
          for (const container of containers) {
            const containerPattern = new RegExp(
              `${container.identifier}\\s*=\\s*container\\s+"[^"]*"\\s+"[^"]*"\\s+"[^"]*"`
            );
            expect(dsl).toMatch(containerPattern);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 9: Container-Level Relationships
describe('Property 9: Container-Level Relationships', () => {
  it('should include relationships from actors to containers', () => {
    fc.assert(
      fc.property(
        actorArb,
        systemArb.map(s => ({ ...s, external: false })),
        containerArb,
        nameArb,
        descriptionArb,
        (actor, mainSystem, container, workspaceName, workspaceDesc) => {
          const relationship: Relationship = {
            source: actor.identifier,
            destination: container.identifier,
            description: 'Uses'
          };
          
          const model: DSLModel = {
            actors: [actor],
            systems: [mainSystem],
            containers: [container],
            relationships: [relationship]
          };
          
          const dsl = generateContainerDSL(model, workspaceName, workspaceDesc);
          
          // Verify relationship is present
          const relPattern = new RegExp(`${actor.identifier}\\s*->\\s*${container.identifier}`);
          expect(dsl).toMatch(relPattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include relationships from containers to external systems', () => {
    fc.assert(
      fc.property(
        systemArb.map(s => ({ ...s, external: false })),
        containerArb,
        systemArb.map(s => ({ ...s, external: true })),
        nameArb,
        descriptionArb,
        (mainSystem, container, externalSystem, workspaceName, workspaceDesc) => {
          const relationship: Relationship = {
            source: container.identifier,
            destination: externalSystem.identifier,
            description: 'Calls'
          };
          
          const model: DSLModel = {
            actors: [],
            systems: [mainSystem, externalSystem],
            containers: [container],
            relationships: [relationship]
          };
          
          const dsl = generateContainerDSL(model, workspaceName, workspaceDesc);
          
          // Verify relationship is present
          const relPattern = new RegExp(`${container.identifier}\\s*->\\s*${externalSystem.identifier}`);
          expect(dsl).toMatch(relPattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 10: CamelCase Identifier Convention
describe('Property 10: CamelCase Identifier Convention', () => {
  it('should use camelCase for all element identifiers', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 5 }),
        fc.array(systemArb, { minLength: 1, maxLength: 3 }),
        nameArb,
        descriptionArb,
        (actors, systems, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems,
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Extract all identifiers from the DSL
          const identifierPattern = /(\w+)\s*=\s*(person|softwareSystem|container)/g;
          let match;
          const identifiers: string[] = [];
          
          while ((match = identifierPattern.exec(dsl)) !== null) {
            identifiers.push(match[1]);
          }
          
          // Verify all identifiers follow camelCase convention
          for (const identifier of identifiers) {
            // camelCase: starts with lowercase, may contain uppercase letters
            expect(identifier).toMatch(/^[a-z][a-zA-Z0-9]*$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 11: Quoted Element Attributes
describe('Property 11: Quoted Element Attributes', () => {
  it('should enclose name and description in double quotes for all elements', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 1, maxLength: 3 }),
        fc.array(systemArb, { minLength: 1, maxLength: 3 }),
        nameArb,
        descriptionArb,
        (actors, systems, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems,
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify person elements have quoted attributes
          for (const actor of actors) {
            const personPattern = new RegExp(`${actor.identifier}\\s*=\\s*person\\s+"[^"]*"\\s+"[^"]*"`);
            expect(dsl).toMatch(personPattern);
          }
          
          // Verify softwareSystem elements have quoted attributes
          for (const system of systems) {
            const systemPattern = new RegExp(`${system.identifier}\\s*=\\s*softwareSystem\\s+"[^"]*"\\s+"[^"]*"`);
            expect(dsl).toMatch(systemPattern);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 12: Unique Identifiers
describe('Property 12: Unique Identifiers', () => {
  it('should ensure all element identifiers are unique within the workspace', () => {
    fc.assert(
      fc.property(
        fc.array(actorArb, { minLength: 2, maxLength: 5 }),
        fc.array(systemArb, { minLength: 1, maxLength: 3 }),
        nameArb,
        descriptionArb,
        (actors, systems, workspaceName, workspaceDesc) => {
          // Ensure unique identifiers in the input
          const allIdentifiers = [
            ...actors.map(a => a.identifier),
            ...systems.map(s => s.identifier)
          ];
          const uniqueIdentifiers = new Set(allIdentifiers);
          
          // Only test if we actually have unique identifiers
          fc.pre(allIdentifiers.length === uniqueIdentifiers.size);
          
          const model: DSLModel = {
            actors,
            systems,
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Extract all identifiers from the DSL
          const identifierPattern = /(\w+)\s*=\s*(person|softwareSystem|container)/g;
          let match;
          const foundIdentifiers: string[] = [];
          
          while ((match = identifierPattern.exec(dsl)) !== null) {
            foundIdentifiers.push(match[1]);
          }
          
          // Verify no duplicates
          const foundSet = new Set(foundIdentifiers);
          expect(foundIdentifiers.length).toBe(foundSet.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 13: Relationship Technology Format
describe('Property 13: Relationship Technology Format', () => {
  it('should place technology in quotes after description for relationships', () => {
    fc.assert(
      fc.property(
        actorArb,
        systemArb,
        descriptionArb,
        technologyArb,
        nameArb,
        descriptionArb,
        (actor, system, relDesc, tech, workspaceName, workspaceDesc) => {
          const relationship: Relationship = {
            source: actor.identifier,
            destination: system.identifier,
            description: relDesc,
            technology: tech
          };
          
          const model: DSLModel = {
            actors: [actor],
            systems: [system],
            containers: [],
            relationships: [relationship]
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify relationship has technology in quotes after description
          const relPattern = new RegExp(
            `${actor.identifier}\\s*->\\s*${system.identifier}\\s+"[^"]*"\\s+"[^"]*"`
          );
          expect(dsl).toMatch(relPattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: c4-structurizr-migration, Property 14: View Configuration Completeness
describe('Property 14: View Configuration Completeness', () => {
  it('should specify softwareSystem scope, include *, and autoLayout for views', () => {
    fc.assert(
      fc.property(
        systemArb.map(s => ({ ...s, external: false })),
        fc.array(actorArb, { minLength: 1, maxLength: 3 }),
        nameArb,
        descriptionArb,
        (mainSystem, actors, workspaceName, workspaceDesc) => {
          const model: DSLModel = {
            actors,
            systems: [mainSystem],
            containers: [],
            relationships: []
          };
          
          const dsl = generateContextDSL(model, workspaceName, workspaceDesc);
          
          // Verify view has system scope
          const scopePattern = new RegExp(`systemContext\\s+${mainSystem.identifier}`);
          expect(dsl).toMatch(scopePattern);
          
          // Verify include * is present
          expect(dsl).toMatch(/include \*/);
          
          // Verify autoLayout is present
          expect(dsl).toMatch(/autoLayout/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
