/**
 * Tests for DSL Validator
 * 
 * These tests verify DSL structure validation, identifier uniqueness,
 * relationship syntax, and view configuration validation.
 */
import { describe, it, expect } from '@jest/globals';
import { DSLValidator } from './dsl-validator';

describe('DSLValidator - Required Sections', () => {
  it('should validate complete DSL structure with all required sections', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
    }
    views {
        systemContext system {
            include *
        }
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error when workspace definition is missing', () => {
    const validator = new DSLValidator();
    const invalidDsl = `
model {
    user = person "User" "A user"
}
views {
}
`;
    
    const result = validator.validate(invalidDsl);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('workspace'))).toBe(true);
  });

  it('should report error when model section is missing', () => {
    const validator = new DSLValidator();
    const invalidDsl = `
workspace "Test" "Test workspace" {
    views {
    }
}
`;
    
    const result = validator.validate(invalidDsl);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('model'))).toBe(true);
  });

  it('should report error when views section is missing', () => {
    const validator = new DSLValidator();
    const invalidDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
    }
}
`;
    
    const result = validator.validate(invalidDsl);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('views'))).toBe(true);
  });
});

describe('DSLValidator - Identifier Uniqueness', () => {
  it('should validate unique identifiers', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        admin = person "Admin" "An admin"
        system = softwareSystem "System" "A system"
    }
    views {
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error for duplicate identifiers', () => {
    const validator = new DSLValidator();
    const invalidDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user = person "Another User" "Duplicate identifier"
    }
    views {
    }
}
`;
    
    const result = validator.validate(invalidDsl);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate identifier'))).toBe(true);
    expect(result.errors.some(e => e.message.includes('user'))).toBe(true);
  });
});

describe('DSLValidator - Relationship Syntax', () => {
  it('should validate correct relationship syntax', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user -> system "Uses"
    }
    views {
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate relationship with technology', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user -> system "Uses" "HTTPS"
    }
    views {
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error for invalid relationship syntax', () => {
    const validator = new DSLValidator();
    const invalidDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user -> system Uses without quotes
    }
    views {
    }
}
`;
    
    const result = validator.validate(invalidDsl);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('relationship syntax'))).toBe(true);
  });
});

describe('DSLValidator - View Configuration', () => {
  it('should validate views section with view definitions', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        system = softwareSystem "System" "A system"
    }
    views {
        systemContext system {
            include *
            autoLayout
        }
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn when views section is empty', () => {
    const validator = new DSLValidator();
    const dslWithEmptyViews = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
    }
    views {
    }
}
`;
    
    const result = validator.validate(dslWithEmptyViews);
    
    expect(result.warnings.some(w => w.message.includes('no view definitions'))).toBe(true);
  });
});

describe('DSLValidator - validateAll', () => {
  it('should validate multiple DSL files', () => {
    const validator = new DSLValidator();
    const dslFiles = new Map<string, string>();
    
    dslFiles.set('file1.dsl', `
workspace "Test1" "Test workspace 1" {
    model {
        user = person "User" "A user"
    }
    views {
    }
}
`);
    
    dslFiles.set('file2.dsl', `
workspace "Test2" "Test workspace 2" {
    model {
        admin = person "Admin" "An admin"
    }
    views {
    }
}
`);
    
    const results = validator.validateAll(dslFiles);
    
    expect(results.size).toBe(2);
    expect(results.get('file1.dsl')?.valid).toBe(true);
    expect(results.get('file2.dsl')?.valid).toBe(true);
  });

  it('should report errors for each invalid file separately', () => {
    const validator = new DSLValidator();
    const dslFiles = new Map<string, string>();
    
    dslFiles.set('valid.dsl', `
workspace "Valid" "Valid workspace" {
    model {
        user = person "User" "A user"
    }
    views {
    }
}
`);
    
    dslFiles.set('invalid.dsl', `
model {
    user = person "User" "A user"
}
`);
    
    const results = validator.validateAll(dslFiles);
    
    expect(results.size).toBe(2);
    expect(results.get('valid.dsl')?.valid).toBe(true);
    expect(results.get('invalid.dsl')?.valid).toBe(false);
    expect(results.get('invalid.dsl')?.errors.length).toBeGreaterThan(0);
  });
});

describe('DSLValidator - Requirements Validation', () => {
  it('validates Requirement 2.1: Workspace definition with name and description', () => {
    const validator = new DSLValidator();
    const dslWithoutWorkspace = `
model {
    user = person "User" "A user"
}
views {
}
`;
    
    const result = validator.validate(dslWithoutWorkspace);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('workspace'))).toBe(true);
  });

  it('validates Requirement 2.2: Model section containing all elements', () => {
    const validator = new DSLValidator();
    const dslWithoutModel = `
workspace "Test" "Test workspace" {
    views {
    }
}
`;
    
    const result = validator.validate(dslWithoutModel);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('model'))).toBe(true);
  });

  it('validates Requirement 2.3: Views section defining diagrams', () => {
    const validator = new DSLValidator();
    const dslWithoutViews = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
    }
}
`;
    
    const result = validator.validate(dslWithoutViews);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('views'))).toBe(true);
  });

  it('validates Requirement 2.4: Proper Structurizr DSL syntax', () => {
    const validator = new DSLValidator();
    const validDsl = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user -> system "Uses"
    }
    views {
        systemContext system {
            include *
        }
    }
}
`;
    
    const result = validator.validate(validDsl);
    
    expect(result.valid).toBe(true);
  });

  it('validates Requirement 2.5: Correct DSL relationship syntax', () => {
    const validator = new DSLValidator();
    const invalidRelationship = `
workspace "Test" "Test workspace" {
    model {
        user = person "User" "A user"
        system = softwareSystem "System" "A system"
        user -> system Missing quotes
    }
    views {
    }
}
`;
    
    const result = validator.validate(invalidRelationship);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('relationship syntax'))).toBe(true);
  });
});
