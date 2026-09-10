const fs = require('fs');
const path = require('path');

function findFiles(dir, regex) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('dist')) {
                results = results.concat(findFiles(file, regex));
            }
        } else {
            if (regex.test(file)) results.push(file);
        }
    });
    return results;
}

// 1. Update package.json files
const packageFiles = findFiles(path.join(__dirname, '../services'), /package\.json$/);
for (const file of packageFiles) {
    if (file.includes('shared')) continue;
    let content = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!content.dependencies) content.dependencies = {};
    content.dependencies['@kiora/shared'] = '*';
    fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
    console.log(`Updated ${file}`);
}

// 2. Replace imports in .ts files
const tsFiles = findFiles(path.join(__dirname, '../services'), /\.ts$/);
for (const file of tsFiles) {
    if (file.includes('shared')) continue;
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace logger imports
    if (content.includes('/logger')) {
        content = content.replace(/import\s+logger\s+from\s+['"](?:\.\.\/)+config\/logger['"];?/g, "import { logger } from '@kiora/shared';");
        content = content.replace(/import\s+logger\s+from\s+['"]\.\/config\/logger['"];?/g, "import { logger } from '@kiora/shared';");
        changed = true;
    }

    // Replace correlationMiddleware imports
    if (content.includes('correlationMiddleware')) {
        content = content.replace(/import\s+correlationMiddleware\s+from\s+['"](?:\.\.\/)+middlewares\/correlationMiddleware['"];?/g, "import { correlationMiddleware } from '@kiora/shared';");
        content = content.replace(/import\s+correlationMiddleware\s+from\s+['"]\.\/middlewares\/correlationMiddleware['"];?/g, "import { correlationMiddleware } from '@kiora/shared';");
        changed = true;
    }
    
    // Replace asyncContext imports (if any)
    if (content.includes('asyncContext')) {
        content = content.replace(/import\s+asyncContext\s+from\s+['"](?:\.\.\/)+utils\/asyncContext['"];?/g, "import { asyncContext } from '@kiora/shared';");
        changed = true;
    }

    // Replace createRedisClient imports
    if (content.includes('createRedisClient') || content.includes('createRedisAdapterClients')) {
        content = content.replace(/import\s+\{\s*(createRedisClient|createRedisAdapterClients)[^}]*\}\s+from\s+['"](?:\.\.\/)+shared\/redis\/createRedisClient['"];?/g, "import { $1 } from '@kiora/shared';");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Refactored imports in ${file}`);
    }
}
