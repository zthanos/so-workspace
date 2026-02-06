/**
 * Verification script to check command registration alignment
 * between package.json declarations and extension.ts registrations
 */

const fs = require('fs');
const path = require('path');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// Read extension.ts and build_open_tasks.ts
const extensionTs = fs.readFileSync(path.join(__dirname, 'src', 'extension.ts'), 'utf8');
const buildOpenTasksTs = fs.readFileSync(path.join(__dirname, 'src', 'build_open_tasks.ts'), 'utf8');

// Extract declared commands from package.json
const declaredCommands = packageJson.contributes.commands.map(cmd => cmd.command);

console.log('=== Command Registration Verification ===\n');
console.log(`Total commands declared in package.json: ${declaredCommands.length}\n`);

// Check each command
let allRegistered = true;
const missingCommands = [];

declaredCommands.forEach(cmd => {
  // Check if command is registered in extension.ts or build_open_tasks.ts
  const isRegistered = extensionTs.includes(`"${cmd}"`) || buildOpenTasksTs.includes(`"${cmd}"`);
  
  if (isRegistered) {
    console.log(`✓ ${cmd}`);
  } else {
    console.log(`✗ ${cmd} - NOT REGISTERED`);
    allRegistered = false;
    missingCommands.push(cmd);
  }
});

console.log('\n=== Summary ===');
if (allRegistered) {
  console.log('✓ All commands are registered in extension.ts');
  console.log('\nKey commands to test:');
  console.log('  - SO: Diagram Evaluate (Select Diagram)');
  console.log('  - SO: Render Diagrams (Local)');
  process.exit(0);
} else {
  console.log(`✗ ${missingCommands.length} command(s) not registered:`);
  missingCommands.forEach(cmd => console.log(`  - ${cmd}`));
  process.exit(1);
}
