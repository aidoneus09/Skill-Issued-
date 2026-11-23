import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Persistent JSON database path
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

const DEFAULT_DB = {
  users: [
    {
      id: 'emp-jollibee-001',
      role: 'employer',
      email: 'hr.manager@jollibee.com.ph',
      password: hashPassword('Jollibee2026!'),
      recruiterName: 'Maria Clara Reyes (Talent Acquisition Lead)',
      companyName: 'Jollibee Foods Corporation (JFC)',
      verified: true,
      createdAt: '2026-01-15T08:00:00.000Z'
    }
  ],
  employerRequests: [],
  workers: [],
  offers: [],
  chatHistories: {}
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Ensure pre-made Jollibee account always exists
    const hasJollibee = (parsed.users || []).some(
      (u) => u.email.toLowerCase() === 'hr.manager@jollibee.com.ph'
    );
    if (!hasJollibee) {
      parsed.users = [...DEFAULT_DB.users, ...(parsed.users || [])];
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return {
      users: parsed.users || [],
      employerRequests: parsed.employerRequests || [],
      workers: parsed.workers || [],
      offers: parsed.offers || [],
      chatHistories: parsed.chatHistories || {}
    };
  } catch (err) {
    console.error('Error reading db.json:', err);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ============================================================================
// CSV LOADING (jobs.csv & skills.csv)
// ============================================================================
let jobsData = [];
let skillsData = [];

function resolveCSVPath(filename) {
  const candidates = [
    path.join(__dirname, filename),
    path.join(__dirname, '..', filename),
    path.join(__dirname, 'data', filename),
    path.join(__dirname, '..', 'data', filename)
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function loadCSV(filename) {
  const resolvedPath = resolveCSVPath(filename);

  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(resolvedPath)) {
      console.error(`File not found: ${resolvedPath}`);
      return resolve([]);
    }

    fs.createReadStream(resolvedPath)
      .on('error', (err) => reject(err))
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
        })
      )
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`Loaded ${results.length} rows from ${resolvedPath}`);
        resolve(results);
      });
  });
}

async function initData() {
  jobsData = await loadCSV('jobs.csv');
  skillsData = await loadCSV('skills.csv');
}

initData();

// ============================================================================
// AUTHENTICATION & ACCOUNT ROUTES
// ============================================================================

// POST /api/auth/signup-worker
app.post('/api/auth/signup-worker', (req, res) => {
  const { fullName, email, password, dob, profile } = req.body;
  if (!fullName || !email || !password || !dob) {
    return res.status(400).json({ error: 'Full name, email, password, and date of birth are required.' });
  }

  const age = calculateAge(dob);
  if (age === null || age < 15) {
    return res.status(403).json({
      error: 'Applicants must be at least 15 years old to create an account and apply for work.'
    });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const userId = `usr-${Date.now()}`;
  const newUser = {
    id: userId,
    role: 'worker',
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: hashPassword(password),
    dob,
    age,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  const workerCard = {
    id: `w-${userId}`,
    userId,
    fullName: fullName.trim(),
    email: normalizedEmail,
    mobile: profile?.mobile || '',
    dob,
    age,
    city: profile?.city || 'Quezon City',
    targetPay: profile?.targetPay || '₱610',
    tracks: profile?.tracks?.length ? profile.tracks : ['General Shift Help'],
    customSkills: profile?.customSkills || 'Ready for immediate shift',
    workExperience: profile?.workExperience || 'Entry-level / First-time jobseeker',
    gear: profile?.gear || [],
    badges: profile?.badges || []
  };

  db.workers = [workerCard, ...db.workers.filter((w) => w.email !== normalizedEmail)];
  writeDB(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, workerProfile: workerCard, chatHistory: [] });
});

// POST /api/auth/request-employer
app.post('/api/auth/request-employer', (req, res) => {
  const { recruiterName, companyName, workEmail, contactNumber, businessPermitInfo } = req.body;
  if (!recruiterName || !companyName || !workEmail) {
    return res.status(400).json({
      error: 'Recruiter name, company name, and official company email are required.'
    });
  }

  const db = readDB();
  const requestEntry = {
    id: `req-${Date.now()}`,
    recruiterName: recruiterName.trim(),
    companyName: companyName.trim(),
    workEmail: workEmail.trim().toLowerCase(),
    contactNumber: (contactNumber || '').trim(),
    businessPermitInfo: (businessPermitInfo || '').trim(),
    status: 'Pending Verification',
    submittedAt: new Date().toISOString()
  };

  db.employerRequests.push(requestEntry);
  writeDB(db);

  res.status(201).json({
    message:
      'Verification request submitted! Our compliance team will review your company credentials and email your verified employer login once approved.',
    request: requestEntry
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  const foundUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!foundUser || foundUser.password !== hashPassword(password)) {
    const pendingReq = db.employerRequests.find((r) => r.workEmail === normalizedEmail);
    if (pendingReq) {
      return res.status(403).json({
        error: `Your company verification request for ${pendingReq.companyName} is still pending approval. You will receive an email once verified.`
      });
    }
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (foundUser.role === 'employer' && !foundUser.verified) {
    return res.status(403).json({
      error: 'Your employer account is awaiting verification before you can access employer tools.'
    });
  }

  const { password: _, ...safeUser } = foundUser;
  const workerProfile =
    foundUser.role === 'worker'
      ? db.workers.find((w) => w.userId === foundUser.id || w.email === normalizedEmail) || null
      : null;
  const chatHistory = db.chatHistories[foundUser.id] || [];

  res.json({ user: safeUser, workerProfile, chatHistory });
});

// ============================================================================
// SKILLS, WORKERS & JOB OFFERS ROUTES
// ============================================================================

app.get('/api/skills', (req, res) => {
  const assignCategoryByRow = (index) => {
    if (index < 20) return 'Finance and Corporate Services';
    if (index < 40) return 'Marketing, Advertising and PR';
    if (index < 60) return 'Engineering and Architecture';
    if (index < 80) return 'Tech and Information Technology';
    return 'Education and Training';
  };

  const normalizedSkills = (skillsData || [])
    .map((row, idx) => {
      const targetJob = (row.Target_Job || row['Target Job'] || 'General').trim();
      const skill = (row.Skill || row.Skills || '').trim();
      const courseTitle = (row.Course_Title || row['Course Title'] || skill).trim();
      let url = (row.URL || row.Link || '').trim().replace(/\s+/g, '');

      if (url.startsWith('https//')) url = url.replace('https//', 'https://');
      if (url && !url.startsWith('http')) url = `https://${url}`;

      return {
        Category: assignCategoryByRow(idx),
        Target_Job: targetJob,
        Skill: skill,
        Course_Title: courseTitle,
        URL: url || '#'
      };
    })
    .filter((item) => item.Course_Title);

  res.json(normalizedSkills);
});

app.get('/api/workers', (req, res) => {
  const employerId = req.headers['x-employer-id'] || req.query.employerId;
  if (!employerId) {
    return res.status(403).json({
      error: 'Access denied. Only verified employer accounts can view worker profiles.'
    });
  }

  const db = readDB();
  const employer = db.users.find(
    (u) => u.id === employerId && u.role === 'employer' && u.verified
  );

  if (!employer) {
    return res.status(403).json({
      error: 'Access denied. Only verified employer accounts can view worker profiles.'
    });
  }

  res.json(db.workers);
});

app.post('/api/workers', (req, res) => {
  const { dob, userId, email } = req.body;
  const age = calculateAge(dob);
  if (age === null || age < 15) {
    return res.status(403).json({
      error: 'Applicants under 15 years old cannot apply for jobs.'
    });
  }

  const db = readDB();
  const existingIdx = db.workers.findIndex(
    (w) => (userId && w.userId === userId) || (email && w.email === email.trim().toLowerCase())
  );

  const workerEntry = {
    id: existingIdx >= 0 ? db.workers[existingIdx].id : `w-${Date.now()}`,
    isNew: true,
    ...req.body,
    age
  };

  if (existingIdx >= 0) {
    db.workers[existingIdx] = workerEntry;
  } else {
    db.workers = [workerEntry, ...db.workers];
  }

  writeDB(db);
  res.status(201).json({ worker: workerEntry, workers: db.workers });
});

// GET /api/offers — Retrieve all structured job offers
app.get('/api/offers', (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) {
    return res.json([]);
  }

  const db = readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.json([]);
  }

  if (user.role === 'employer') {
    const employerOffers = db.offers.filter((o) => o.employerId === user.id);
    return res.json(employerOffers);
  }

  // Worker account: match offers sent to their worker profile ID or email
  const workerProfile = db.workers.find(
    (w) => w.userId === user.id || w.email?.toLowerCase() === user.email?.toLowerCase()
  );

  const workerOffers = db.offers.filter(
    (o) =>
      (workerProfile && o.workerId === workerProfile.id) ||
      (o.workerEmail && o.workerEmail.toLowerCase() === user.email.toLowerCase())
  );

  res.json(workerOffers);
});

// POST /api/offers — Verified employers send structured job offers
app.post('/api/offers', (req, res) => {
  const {
    employerId,
    workerId,
    workerName,
    workerEmail,
    recruiterName,
    companyName,
    jobTitle,
    salary,
    workingHours,
    benefits,
    note
  } = req.body;

  const db = readDB();
  const employer = db.users.find((u) => u.id === employerId && u.role === 'employer');

  if (!employer || !employer.verified) {
    return res.status(403).json({
      error: 'Only verified employer accounts can send job offers to workers.'
    });
  }

  if (!recruiterName || !companyName || !jobTitle || !salary || !workingHours) {
    return res.status(400).json({
      error: 'Recruiter name, company name, job offered, salary, and working hours are required.'
    });
  }

  const newOffer = {
    id: `off-${Date.now()}`,
    employerId: employer.id,
    workerId,
    workerName,
    workerEmail: workerEmail || '',
    recruiterName: recruiterName.trim(),
    companyName: companyName.trim(),
    jobTitle: jobTitle.trim(),
    salary: salary.trim(),
    workingHours: workingHours.trim(),
    benefits: (benefits || 'Standard statutory benefits').trim(),
    status: 'Pending Worker Response',
    createdAt: new Date().toISOString(),
    messages: note?.trim()
      ? [{ senderRole: 'employer', senderName: recruiterName.trim(), text: note.trim(), time: 'Just now' }]
      : []
  };

  db.offers = [newOffer, ...db.offers];
  writeDB(db);

  res.status(201).json({ offer: newOffer, offers: db.offers });
});

// POST /api/offers/:id/reply — Worker or Employer updates status / sends reply
app.post('/api/offers/:id/reply', (req, res) => {
  const { id } = req.params;
  const { senderRole, senderName, text, status } = req.body;

  const db = readDB();
  const offerIdx = db.offers.findIndex((o) => o.id === id);
  if (offerIdx === -1) {
    return res.status(404).json({ error: 'Job offer not found.' });
  }

  if (status) {
    db.offers[offerIdx].status = status;
  }
  if (text && text.trim()) {
    db.offers[offerIdx].messages.push({
      senderRole,
      senderName,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  writeDB(db);
  res.json({ offer: db.offers[offerIdx], offers: db.offers });
});

// ============================================================================
// AI CAREER COACH ROUTE (ENGLISH ONLY + SAVED HISTORY FOR LOGGED-IN USERS)
// ============================================================================
app.post('/api/chat', async (req, res) => {
  try {
    const { workerProfile, userMessage, chatHistory = [], userId } = req.body;

    const systemInstruction = `You are the "Skill: Issued!" Career & Hiring Coach for jobseekers in the Philippines.
IMPORTANT: Always respond strictly in clear, encouraging, professional English. Do not use Tagalog or Taglish.
Always format job and course URLs as clickable Markdown links using the job or course title, like [Apply at Company Name](https://example.com) or [Course Title](https://example.com). Never output raw, unformatted URLs.
Base your job recommendations strictly on the provided jobs.csv dataset and your upskilling/course recommendations strictly on the provided skills.csv dataset. Always include clickable markdown links [Title](URL) when recommending jobs or courses.

WORKER DIGITAL SKILL CARD:
- Name: ${workerProfile?.fullName || 'Worker'}
- City/Area: ${workerProfile?.city || 'Metro Manila'}
- Age: ${workerProfile?.age || '18+'}
- Target Minimum Pay: ${workerProfile?.targetPay || '₱610'}
- Job Tracks: ${(workerProfile?.tracks || []).join(', ') || 'General'}
- Current Skills: ${workerProfile?.customSkills || 'None listed'}
- Work Experience: ${workerProfile?.workExperience || 'Entry-level'}
- Materials/Gear Ready: ${(workerProfile?.gear || []).join(', ') || 'None'}
- Document Badges on Hand: ${(workerProfile?.badges || []).join(', ') || 'None yet'}

AVAILABLE JOBS (jobs.csv):
${JSON.stringify(jobsData.slice(0, 80))}

AVAILABLE COURSES & SKILLS (skills.csv):
${JSON.stringify(skillsData.slice(0, 100))}`;

    const contents = [
      ...chatHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    const replyText = response.text;

    // Persist chat history if user is logged in
    if (userId) {
      const db = readDB();
      const existing = db.chatHistories[userId] || [];
      db.chatHistories[userId] = [
        ...existing,
        { role: 'user', text: userMessage },
        { role: 'model', text: replyText }
      ];
      writeDB(db);
    }

    res.json({ reply: replyText });
  } catch (err) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI response.' });
  }
});

app.listen(PORT, () => {
  console.log(`Skill: Issued! Backend running on http://localhost:${PORT}`);
});