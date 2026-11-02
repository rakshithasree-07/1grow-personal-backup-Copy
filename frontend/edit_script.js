const fs = require('fs');

const path = '/home/naveen/projects/kalai_arangam/frontend/src/components/shared/OrganisationPageContent.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Add extractColorsFromImage
const extractColorsHelper = `
function extractColorsFromImage(url: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve([]);
        
        const maxSize = 100;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        const colorCounts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4 * 2) {
          const a = data[i+3];
          if (a < 128) continue;
          const r = data[i], g = data[i+1], b = data[i+2];
          
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (luminance < 0.05 || luminance > 0.95) continue;
          
          const quantize = 32;
          const rq = Math.round(r / quantize) * quantize;
          const gq = Math.round(g / quantize) * quantize;
          const bq = Math.round(b / quantize) * quantize;
          
          const hex = \`#\${Math.min(255, rq).toString(16).padStart(2, '0')}\${Math.min(255, gq).toString(16).padStart(2, '0')}\${Math.min(255, bq).toString(16).padStart(2, '0')}\`;
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        
        const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).map(([color]) => color);
        resolve(sorted.slice(0, 5));
      } catch (e) {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = url;
  });
}
`;

content = content.replace('export function OrganisationPageContent', extractColorsHelper + '\nexport function OrganisationPageContent');

// State replacements
content = content.replace('const [editMode, setEditMode] = useState(false);', 'const [editSection, setEditSection] = useState<string | null>(null);\n  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);');

// handleCancel replacement
content = content.replace('const handleCancel = () => { if (tenant) loadData(); setEditMode(false); };', 'const handleCancel = () => { if (tenant) loadData(); setEditSection(null); };');

// handleSave replacement
content = content.replace('setEditMode(false);', 'setEditSection(null);');

// image upload suggestion extraction
content = content.replace('const result = await uploadToStorage(file, category);', 'const result = await uploadToStorage(file, category);\n      if (field === "logoUrl") {\n        extractColorsFromImage(result.url).then(colors => setSuggestedColors(colors));\n      }');

// replace PageContainer actions completely (remove global edit button)
const actionsRegex = /actions=\{[\s\S]*?\}/;
content = content.replace(actionsRegex, 'actions={undefined}');

// replace editMode with editSection logic for branding (branding doesn't use editMode for images, but for tagline)
content = content.replace(/\{editMode && \(/g, '{editSection === "branding" && (');
content = content.replace(/\{\!editMode && form.tagline && \(/g, '{editSection !== "branding" && form.tagline && (');

// add edit button to Branding card
content = content.replace(/<Camera size=\{16\} className="text-primary" \/> Branding\s+<\/h3>/, 
\`<Camera size={16} className="text-primary" /> Branding
            </h3>
            {!isBranchManager && editSection !== "branding" && (
              <Button size="xs" variant="outline" onClick={() => setEditSection("branding")} className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-6">
                <Edit3 size={14} className="mr-1" /> Edit
              </Button>
            )}\`);
// add save/cancel button for branding if needed. Wait, branding images upload instantly. 
// We should just add save buttons at the end of the sections.
content = content.replace(/<\/div>\s*<\/Card>\s*\{\/\* ── Theme & Colors Section ── \*\/\}/, 
\`  {editSection === "branding" && (
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : "Save Changes"}</Button>
                </div>
              )}
            </div>
          </Card>
          
          {/* ── Theme & Colors Section ── */}\`);

// replace editMode for basic info
content = content.replace(/<Building2 size=\{16\} className="text-primary" \/> Basic Information\s+<\/h3>\s+\{tenant\?\.status/, 
\`<Building2 size={16} className="text-primary" /> Basic Information
              </h3>
              {!isBranchManager && editSection !== "basicInfo" && (
                <Button size="xs" variant="outline" onClick={() => setEditSection("basicInfo")} className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-6">
                  <Edit3 size={14} className="mr-1" /> Edit
                </Button>
              )}
              {tenant?.status\`);

content = content.replace(/\{editMode \?/g, '{editSection === "basicInfo" ?');
// Oh wait, there are multiple {editMode ? in the file, so replacing them needs to be specific.
