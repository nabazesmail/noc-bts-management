const fs = require("fs");
const lines = fs.readFileSync("C:\\Users\\nabaz.ismael\\.gemini\\antigravity-ide\\brain\\3f8c11cc-f64f-4869-ad30-d9346d75e722\\.system_generated\\logs\\transcript_full.jsonl", "utf8").split("\n");
let lastUserInput = "";
for (let line of lines) {
    if (line.includes("\"type\":\"USER_INPUT\"")) {
        lastUserInput = line;
    }
}
const json = JSON.parse(lastUserInput);
let content = json.content;
const match = content.match(/(Quarter,Month,Start Date.*)/s);
if (match) {
    let csv = match[1];
    // Remove the <USER_REQUEST> blocks or anything else at the end
    csv = csv.split("<USER_REQUEST>")[0].trim();
    fs.writeFileSync("src/data/fiber_cuts.csv", csv);
    console.log("Extracted successfully");
} else {
    console.log("Could not find the header in the string");
}

