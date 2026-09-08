import re

with open('src/pages/FiberCutForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix schema mismatches
content = content.replace('supervisors_name', 'supervisor_name')
content = content.replace('link_sla_status2', 'link_sla_status')

# 2. Fix time inputs to text
content = re.sub(r'type="time"', r'type="text" placeholder="HH:mm"', content)

# 3. Fix uncontrolled input warnings
# Find all value={formData.something} and replace with value={formData.something || ""}
content = re.sub(r'value=\{formData\.([a-zA-Z0-9_]+)\}', r'value={formData.\1 || ""}', content)

with open('src/pages/FiberCutForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed FiberCutForm.tsx")
