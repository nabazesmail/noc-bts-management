import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFileName = "project_code_export.txt";
const rootDir = __dirname;

// Folders and file types you want to ignore
const excludeDirs = ["node_modules", ".git", "dist", "build", "public"];
const excludeExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".pdf",
  ".zip",
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludeDirs.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      // Skip ignored extensions, the script itself, and the output file
      if (
        !excludeExtensions.includes(ext) &&
        file !== outputFileName &&
        file !== "combine.js" &&
        file !== "package-lock.json"
      ) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

try {
  const allFiles = getAllFiles(rootDir);
  let combinedContent = "";

  allFiles.forEach((file) => {
    const relativePath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, "utf8");

    // Add clear headers for each file so the LLM or reader knows where one ends and another begins
    combinedContent += `\n\n================================================================================\n`;
    combinedContent += `FILE: ${relativePath}\n`;
    combinedContent += `================================================================================\n\n`;
    combinedContent += content;
  });

  fs.writeFileSync(outputFileName, combinedContent);
  console.log(
    `✅ Success! Combined ${allFiles.length} files into ${outputFileName}`,
  );
} catch (error) {
  console.error("Error combining files:", error);
}
