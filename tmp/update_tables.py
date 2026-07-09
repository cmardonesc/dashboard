import re

with open('components/FisicaArea.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Wellness fatigue, sleep, soreness
for field in ['fatigue', 'sleep', 'soreness']:
    pattern = r'<td className="px-0\.5 py-0\.5 text-center">\s*\{data \?\s*\(\s*<span className=\{\`w-3\.5 h-3\.5 flex items-center justify-center mx-auto rounded-full text-black text-\[6\.5px\] font-black \$\{getScoreColor\(data\.' + field + r'\)\}\`\}>\s*\{data\.' + field + r'\}\s*</span>\s*\) : \'-\'\}\s*</td>'
    replacement = r'<td className={`px-0.5 py-0.5 text-center text-[7.5px] font-black ${data ? getScoreColor(data.' + field + r') : "text-slate-300"}`}>{data ? data.' + field + r' : "-"}</td>'
    content = re.sub(pattern, replacement, content)

# 2. Update Wellness stress
pattern_stress = r'<td className="px-0\.5 py-0\.5 text-center">\s*\{data \?\s*\(\s*<span className=\{\`w-3\.5 h-3\.5 flex items-center justify-center mx-auto rounded-full text-black text-\[6\.5px\] font-black \$\{getScoreColor\(data\.stress \|\| data\.stres \|\| 0\)\}\`\}>\s*\{data\.stress \|\| data\.stres \|\| 0\}\s*</span>\s*\) : \'-\'\}\s*</td>'
replacement_stress = r'<td className={`px-0.5 py-0.5 text-center text-[7.5px] font-black ${data ? getScoreColor(data.stress || data.stres || 0) : "text-slate-300"}`}>{data ? (data.stress || data.stres || 0) : "-"}</td>'
content = re.sub(pattern_stress, replacement_stress, content)

# 3. Update Wellness mood
pattern_mood = r'<td className="px-0\.5 py-0\.5 text-center">\s*\{data \?\s*\(\s*<span className=\{\`w-3\.5 h-3\.5 flex items-center justify-center mx-auto rounded-full text-black text-\[6\.5px\] font-black \$\{getScoreColor\(data\.mood \|\| data\.ani \|\| 0\)\}\`\}>\s*\{data\.mood \|\| data\.ani \|\| 0\}\s*</span>\s*\) : \'-\'\}\s*</td>'
replacement_mood = r'<td className={`px-0.5 py-0.5 text-center text-[7.5px] font-black ${data ? getScoreColor(data.mood || data.ani || 0) : "text-slate-300"}`}>{data ? (data.mood || data.ani || 0) : "-"}</td>'
content = re.sub(pattern_mood, replacement_mood, content)

# 4. Update Loads RPE Avg
pattern_rpe = r'<td className="px-1 py-0\.5 text-center">\s*\{rpeAvg \?\s*\(\s*<span\s+className="inline-flex items-center justify-center px-1\.5 py-0\.5 min-w-\[22px\] rounded text-\[7\.5px\] text-black font-black font-mono leading-none"\s+style=\{getRpeStyle\(rpeAvg\)\}\s*>\s*\{rpeAvg\.toFixed\(1\)\}\s*</span>\s*\) : \(\s*<span className="text-slate-300 font-bold font-mono text-\[7\.5px\]">—</span>\s*\)\}\s*</td>'
replacement_rpe = r'<td className={`px-1 py-0.5 text-center font-black font-mono text-[7.5px] ${rpeAvg ? "" : "text-slate-300"}`} style={rpeAvg ? getRpeStyle(rpeAvg) : undefined}>{rpeAvg ? rpeAvg.toFixed(1) : "—"}</td>'
content = re.sub(pattern_rpe, replacement_rpe, content)

# 5. Update Loads totalLoad
pattern_load = r'<td className="px-1 py-0\.5 text-center">\s*\{totalLoad \?\s*\(\s*<span\s+className="inline-flex items-center justify-center px-1\.5 py-0\.5 min-w-\[32px\] rounded text-\[7\.5px\] text-black font-black font-mono leading-none"\s+style=\{getCargaStyle\(totalLoad\)\}\s*>\s*\{totalLoad\}\s*</span>\s*\) : \(\s*<span className="text-slate-300 font-bold font-mono text-\[7\.5px\]">0</span>\s*\)\}\s*</td>'
replacement_load = r'<td className={`px-1 py-0.5 text-center font-black font-mono text-[7.5px] ${totalLoad ? "" : "text-slate-300"}`} style={totalLoad ? getCargaStyle(totalLoad) : undefined}>{totalLoad || "0"}</td>'
content = re.sub(pattern_load, replacement_load, content)

with open('components/FisicaArea.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete successfully!")
