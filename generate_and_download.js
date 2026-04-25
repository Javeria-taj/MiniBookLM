const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ==========================================
// CONFIGURATION
// Create a .env file or export these variables
// ==========================================
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERNAL_SECRET_TOKEN = process.env.INTERNAL_SECRET_TOKEN;

if (!INTERNAL_SECRET_TOKEN) {
    console.error("❌ INTERNAL_SECRET_TOKEN environment variable is missing.");
    process.exit(1);
}

// ==========================================
// VIDEO INPUTS
// Modify these to change what video is generated
// ==========================================
const videoInputs = {
    // Required base fields
    template: "simulation-arc", // Currently supported: "simulation-arc" (Science/STEM) or "moral-story"
    topic: "Gravity",
    environment: "A vast grassy field under a bright blue sky",
    characterName: "Dr. Newton",
    gradeLevel: "Grade 8", // E.g., "Grade 1", "Grade 8", "Grade 12"

    // Optional overrides for Science (`simulation-arc`) template only:
    
    // arcId: "detective-arc", 
    /*
     * Valid arcId options (if omitted, auto-selected based on grade & topic):
     * - "simulation-arc"         (General STEM, default)
     * - "misconception-trap"     (Newton's Laws, heat/temp, electricity, evolution) [Grades 4-12]
     * - "detective-arc"          (Chemistry reactions, ecology, mystery phenomena) [Grades 4-12]
     * - "scale-journey"          (Cells, atoms, cosmology, microscopy) [Grades 4-12]
     * - "systems-failure"        (Circulatory system, circuits, ecosystems) [Grades 4-12]
     * - "thought-experiment"     (Physics laws, quantum, relativity) [Grades 9-12 ONLY]
     * - "two-world-contrast"     (Acid/base, aerobic/anaerobic, phase transitions) [Grades 4-12]
     * - "engineers-arc"          (Applied physics, structural design, thermodynamics) [Grades 4-12]
     * - "historical-discovery"   (Evolution, atomic model, germ theory, DNA) [Grades 9-12 ONLY]
     * - "wonder-first"           (Optics, electromagnetism, bioluminescence) [All Grades]
     */

    // styleId: "anime"
    /*
     * Valid styleId options (if omitted, auto-selected based on grade & arc):
     * - "cinematic-3d"           (Pixar-influenced, volumetric lighting) [All grades]
     * - "anime"                  (Cel-shaded, expressive, bold outlines) [Grades 6-12]
     * - "flat-editorial"         (Clean geometric, minimal) [All grades]
     * - "watercolor-storybook"   (Soft painted, warm, approachable) [Grades 1-6]
     * - "retro-comic"            (Bold outlines, pop-art, high contrast) [Grades 1-8]
     */
};

/**
 * Dependency-Free HS256 JWT Generation
 */
function createToken(secret, payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

/**
 * Native Node fetch wrapper
 */
async function apiCall(url, method = 'GET', body = null, headers = {}) {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            let errText;
            try {
                const data = await response.json();
                errText = data.error;
            } catch {
                errText = await response.text();
            }
            throw new Error(errText || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error(`API Call failed (${url}):`, err.message);
        throw err;
    }
}

/**
 * Download a file via streaming HTTP response
 */
function downloadVideoBuffer(url, dest, method = 'POST', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const { URL } = require('url');
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = client.request(options, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                return downloadVideoBuffer(response.headers.location, dest, 'GET', null, headers).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download resource: HTTP ${response.statusCode}`));
            }
            
            const total = parseInt(response.headers['content-length'] || 0, 10);
            let downloaded = 0;

            response.pipe(file);
            
            response.on('data', (chunk) => {
               downloaded += chunk.length;
               if (total > 0) {
                   const percent = ((downloaded / total) * 100).toFixed(1);
                   process.stdout.write(`\r   Downloading... ${percent}%      `);
               } else {
                   process.stdout.write(`\r   Downloading... ${(downloaded / 1024 / 1024).toFixed(2)} MB      `);
               }
            });

            file.on('finish', () => {
                file.close(resolve);
            });
        });

        req.on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

(async () => {
    try {
        console.log("=================================================");
        console.log("🤖 GSQ Standalone Video Generation Client");
        console.log("=================================================\n");

        console.log("1️⃣ Generating authentication token...");
        const token = createToken(INTERNAL_SECRET_TOKEN, { platform: "external-script", exp: Math.floor(Date.now() / 1000) + 3600 });
        const authHeaders = { Authorization: `Bearer ${token}` };

        console.log(`2️⃣ Submitting task to GSQ Engine at ${BASE_URL}...`);
        const genResponse = await apiCall(`${BASE_URL}/api/generate`, 'POST', videoInputs, authHeaders);
        
        const jobId = genResponse.jobId;
        console.log(`✅ Job Accepted! Job ID: ${jobId}`);

        console.log("\n3️⃣ Polling for job completion (this takes ~2-3 minutes)...");
        let cf_id = null;
        let finalTitle = videoInputs.topic;
        
        while (true) {
            const statusRes = await apiCall(`${BASE_URL}/api/status/${jobId}`, 'GET', null, authHeaders);
            const status = statusRes.job.status;
            
            process.stdout.write(`\r   Status: [${status}] ...     `);

            if (status === 'COMPLETED') {
                cf_id = statusRes.job.cf_id;
                // If title somehow changed
                finalTitle = statusRes.job.title || finalTitle; 
                console.log(`\n✅ Video fully generated! Cloudflare Stream ID: ${cf_id}`);
                break;
            } else if (status === 'FAILED') {
                console.log(`\n❌ Video generation failed.`);
                process.exit(1);
            }

            await new Promise(r => setTimeout(r, 5000));
        }

        console.log("\n=================================================");
        console.log("🎬 COMMENCING DOWNLOAD");
        console.log("=================================================");
        
        // Use the Engine's Download endpoint, which verifies auth and fetches via Cloudflare
        console.log("4️⃣ Calling Engine Download endpoint...");
        const outputPath = `./${jobId}-video.mp4`;
        
        await downloadVideoBuffer(
            `${BASE_URL}/api/stream/download-url`,
            outputPath,
            'POST',
            { cf_id: cf_id, title: finalTitle },
            authHeaders
        );
        
        console.log(`\n✅ Download complete! File saved as ${outputPath}`);
        console.log("🎉 All done.");

    } catch (err) {
        console.error("\n❌ Fatal Error:", err.message);
    }
})();
