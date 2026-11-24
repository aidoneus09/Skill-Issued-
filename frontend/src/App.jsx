import { useState, useEffect, useRef } from 'react';
import logoImg from './assets/LOGO2.png';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://skill-issued.onrender.com');

const DEFAULT_WELCOME_MSG = {
  role: 'model',
  text: 'Welcome! Based on your Digital Skill Card, skills, and experience, I can match you with open jobs and recommend free upskilling courses. Choose a topic below or type your own question!'
};

const SAMPLE_WORKERS = [
  {
    id: 'w-juan-sample',
    isSample: true,
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@email.com',
    dob: '2004-05-15',
    age: 22,
    gender: 'Male',
    education: 'High School Diploma',
    city: 'Quezon City, Cubao',
    targetPay: '₱610',
    tracks: ['Food Service', 'Retail and Promo'],
    customSkills: 'POS operation, cashiering, customer service, stock handling',
    workExperience: '6 months Service Crew & weekend promo assistant',
    gear: ['Phone', 'Work shoes'],
    badges: ['Barangay Clearance', 'Health Certificate', 'NBI Clearance']
  }
];

const COURSE_CATEGORIES = [
  { name: 'All', bg: '#F8D5FA', color: '#4A2559', border: '#E48CEB' },
  { name: 'Finance and Corporate Services', bg: '#FFF7CC', color: '#78350F', border: '#F59E0B' },
  { name: 'Marketing, Advertising and PR', bg: '#FFE4EF', color: '#831843', border: '#F472B6' },
  { name: 'Engineering and Architecture', bg: '#FCE6FA', color: '#701A75', border: '#D946EF' },
  { name: 'Tech and Information Technology', bg: '#DDFBF9', color: '#115E59', border: '#14B8A6' },
  { name: 'Education and Training', bg: '#CBF5EA', color: '#065F46', border: '#10B981' }
];

const DOCUMENT_GUIDES = [
  {
    title: 'Barangay Clearance',
    information: 'Official document verifying your residency, good moral character, and lack of derogatory records',
    where: 'Local Barangay Hall',
    time: 'Same day (15–30 mins)',
    feeNote: 'Waived or discounted with First-Time Jobseeker Barangay Certificate.',
    bring: 'Valid ID or Birth Certificate, Proof of residency'
  },
  {
    title: 'Health Certificate',
    information: 'Official document confirming that a person meets health and sanitation standards',
    where: 'City / Municipal Health Office (required for Food & Retail)',
    time: '1–2 days (after lab tests)',
    feeNote: 'Waived or discounted with First-Time Jobseeker Barangay Certificate.',
    bring: 'Valid ID, 1x1 photo, and lab results (urinalysis, fecalysis, chest X-ray)'
  },
  {
    title: 'NBI Clearance',
    information: 'Official document certifying that you have no pending criminal cases or convictions on record',
    where: 'Online appointment at clearance.nbi.gov.ph + NBI Branch',
    time: 'Same day (if no "Hit") / 5–10 working days (with "Hit")',
    feeNote: 'Waived or discounted with First-Time Jobseeker Barangay Certificate.',
    bring: '2 Valid Government IDs + Barangay First-Time Jobseeker Certificate'
  },
  {
    title: 'SSS / PhilHealth / Pag-IBIG',
    information: 'Mandatory social security and benefit programs for retirement/social insurance, health care, and savings/housing for employed workers',
    where: 'Online (My.SSS, Pag-IBIG Virtual) or local branch',
    time: 'Same day (E1 / MDF / MID number issued immediately)',
    feeNote: 'Free registration for new members.',
    bring: 'PSA Birth Certificate + 1 Valid ID'
  }
];

const INTERVIEW_GUIDES = [
  {
    title: 'Explaining sari-sari store, family business, or school org work experience',
    tag: 'No Formal Resume',
    content:
      'If you are a first time worker, instead of saying "I have no experience yet," you can say: \n \n• "I helped manage our family retail store for a year, handling cash change, daily inventory checks, and assisted various types of customers."\n• "In our school organization, I managed logistics and organized event supplies, so I am comfortable working in fast-paced environments."'
  },
  {
    title: 'Sample answers to common shift interview questions',
    tag: 'Interview Prep',
    content:
      'When answering, list your strengths and the soft skills and hard skills that makes you a good employee\n\n Q: "Why should we hire you for this shift?"\nA:"I arrive early, learn quickly, and already have my basic pre-employment documents ready so I can start immediately. I also have strong customer communication skills."\n\nQ: "Are you comfortable with shifting schedules or weekend shifts?"\nA: "Yes, my schedule is flexible and I can reliably report to my assigned shifts."'
  },
  {
    title: 'First Shift Checklist: What to wear & bring',
    tag: 'Shift-Ready',
    content:
      '• If there is no formal uniform, wear clean, closed-toe shoes (work shoes/sneakers), neat pants, and a plain collared shirt or clean t-shirt.\n• Bring photocopies of required documents and valid IDs.\n• Bring materials and items that your employer or the job details have asked you to bring. \n• Arrive 15–20 minutes early and message your shift manager once you arrive on site.'
  }
];

function computeAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Local vault helpers so accounts, profiles, and chat histories survive Render free-tier sleep cycles
function getAccountVault() {
  try {
    return JSON.parse(localStorage.getItem('si_account_vault') || '{}');
  } catch {
    return {};
  }
}

function saveToAccountVault(email, record) {
  if (!email) return;
  try {
    const vault = getAccountVault();
    const key = email.trim().toLowerCase();
    vault[key] = {
      ...(vault[key] || {}),
      ...record,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('si_account_vault', JSON.stringify(vault));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [view, setView] = useState('setup'); // 'setup' | 'card' | 'offers' | 'resources' | 'employer'
  const [activeSection, setActiveSection] = useState(1);

  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup-worker' | 'request-employer'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    recruiterName: '',
    companyName: '',
    contactNumber: '',
    businessPermitInfo: ''
  });

  // Worker Profile State
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    mobile: '',
    dob: '',
    gender: '',
    education: '',
    city: '',
    targetPay: '₱610',
    tracks: [],
    customSkills: '',
    workExperience: '',
    gear: [],
    badges: []
  });
  const [dobError, setDobError] = useState('');
  const [setupFeedback, setSetupFeedback] = useState('');

  const [savedWorkers, setSavedWorkers] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [courseFilter, setCourseFilter] = useState('All');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [openGuideIdx, setOpenGuideIdx] = useState(0);

  // Job Offers State (Strictly scoped to logged-in user)
  const [jobOffers, setJobOffers] = useState([]);
  const [offerReplyInputs, setOfferReplyInputs] = useState({});
  const [selectedOfferId, setSelectedOfferId] = useState('ALL');

  // AI Chat State
  const [messages, setMessages] = useState([DEFAULT_WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const aiChatContainerRef = useRef(null);
  const offerChatRefs = useRef({});

  // Auto-scroll AI Career Coach chat to the newest message when opened or updated
  useEffect(() => {
    if (view === 'card' && aiChatContainerRef.current) {
      aiChatContainerRef.current.scrollTop = aiChatContainerRef.current.scrollHeight;
    }
  }, [messages, loading, view]);

  // Auto-scroll Offer Discussion chatboxes to the newest message when opened or updated
  useEffect(() => {
    if (view === 'offers') {
      Object.values(offerChatRefs.current).forEach((el) => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    }
  }, [jobOffers, view]);

  // Employer Filter & Structured Offer Modal State
  const [empSearch, setEmpSearch] = useState('');
  const [empCity, setEmpCity] = useState('');
  const [empTrack, setEmpTrack] = useState('All');
  const [empAgeBracket, setEmpAgeBracket] = useState('All');
  const [empRequiredBadges, setEmpRequiredBadges] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [offerForm, setOfferForm] = useState({
    recruiterName: 'Maria Clara Reyes (Talent Acquisition Lead)',
    companyName: 'Jollibee Foods Corporation (JFC)',
    jobTitle: 'Store Service Crew',
    salary: '₱645 / day + Overtime Pay',
    workingHours: '8:00 AM – 5:00 PM (Mon–Sat, 1 hr break)',
    benefits: 'Free crew meal per shift, HMO coverage, uniform provided, SSS/PhilHealth/Pag-IBIG',
    note: 'Hello! We reviewed your Digital Skill Card and document badges and would love to invite you to join our store team.'
  });
  const [offerFeedback, setOfferFeedback] = useState('');

  const quickPrompts = [
    {
      label: '💼 Best Jobs for Me',
      prompt:
        'Based on my job tracks, skills, work experience, and gear, which jobs and adjacent roles in the jobs database fit me best? Include the Company and URL.'
    },
    {
      label: '📚 Missing Skills & Courses',
      prompt:
        'Compare my current skills and experience against the skills data base. What skills do I already have, and which free courses should I take next for my target role?'
    },
    {
      label: '🪪 Hiring Readiness & Badges',
      prompt:
        'Review my document badges. Which jobs am I already shift-ready for right now, and which documents should I prioritize next?'
    },
    {
      label: '🎤 Practice Interview',
      prompt:
        'Give me 2 common interview questions for my target job track along with strong sample answers tailored to my experience and skills.'
    },
    {
      label: '💰 Qualify for Higher Pay',
      prompt:
        'How can I qualify for higher shift pay rates (₱750+ or ₱900+/day) using the skills and courses in the skills database?'
    }
  ];

  // Smooth view switcher with scroll-to-top
  const navigateToView = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial load: courses and saved user session (with automatic backend sync)
  useEffect(() => {
    fetch(`${API_BASE}/api/skills`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCoursesList(data);
      })
      .catch((err) => console.error('Could not load skills courses:', err));

    const savedSession = localStorage.getItem('si_user_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user) {
          setCurrentUser(parsed.user);
          if (parsed.workerProfile) {
            setProfile((prev) => ({ ...prev, ...parsed.workerProfile }));
          }
          if (parsed.chatHistory?.length > 0) {
            setMessages([DEFAULT_WELCOME_MSG, ...parsed.chatHistory]);
          }
          if (parsed.user.role === 'employer') {
            setOfferForm((prev) => ({
              ...prev,
              recruiterName: parsed.user.recruiterName || prev.recruiterName,
              companyName: parsed.user.companyName || prev.companyName
            }));
          }

          // Re-sync session to backend in case Render spun down and reset db.json
          const vaultRecord = getAccountVault()[parsed.user.email?.toLowerCase()];
          fetch(`${API_BASE}/api/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: parsed.user,
              passwordHash: vaultRecord?.passwordHash,
              workerProfile: parsed.workerProfile || vaultRecord?.workerProfile,
              chatHistory: parsed.chatHistory || vaultRecord?.chatHistory || []
            })
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((synced) => {
              if (synced?.user) {
                setCurrentUser(synced.user);
                if (synced.workerProfile) {
                  setProfile((prev) => ({ ...prev, ...synced.workerProfile }));
                }
                if (synced.chatHistory?.length > 0) {
                  setMessages([DEFAULT_WELCOME_MSG, ...synced.chatHistory]);
                }
                localStorage.setItem('si_user_session', JSON.stringify(synced));
              }
            })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem('si_user_session');
      }
    }
  }, []);

// Fetch & auto-refresh job offers in real time when viewing Offers
  useEffect(() => {
    if (!currentUser?.id) {
      setJobOffers([]);
      return;
    }

    const fetchOffers = () => {
      fetch(`${API_BASE}/api/offers?userId=${encodeURIComponent(currentUser.id)}`, {
        headers: { 'x-user-id': currentUser.id }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data)) {
            setJobOffers((prev) =>
              JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
            );
          }
        })
        .catch(() => {});
    };

    fetchOffers();

    const intervalMs = view === 'offers' ? 3000 : 10000;
    const timer = setInterval(fetchOffers, intervalMs);
    return () => clearInterval(timer);
  }, [currentUser, view]);

  // Fetch registered worker profiles ONLY when signed in as a verified employer
  useEffect(() => {
    if (currentUser?.role === 'employer' && currentUser?.verified) {
      fetch(`${API_BASE}/api/workers?employerId=${encodeURIComponent(currentUser.id)}`, {
        headers: { 'x-employer-id': currentUser.id }
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setSavedWorkers(data.filter((w) => Boolean(w.userId)));
          }
        })
        .catch((err) => console.error('Could not load saved workers:', err));
    } else {
      setSavedWorkers([]);
    }
  }, [currentUser]);

  // Fetch registered worker profiles ONLY when signed in as a verified employer
  useEffect(() => {
    if (currentUser?.role === 'employer' && currentUser?.verified) {
      fetch(`${API_BASE}/api/workers?employerId=${encodeURIComponent(currentUser.id)}`, {
        headers: { 'x-employer-id': currentUser.id }
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setSavedWorkers(data.filter((w) => Boolean(w.userId)));
          }
        })
        .catch((err) => console.error('Could not load saved workers:', err));
    } else {
      setSavedWorkers([]);
    }
  }, [currentUser]);

  const computedAge = computeAgeFromDob(profile.dob);
  const isUnder18 = computedAge !== null && computedAge < 18;

  const toggleItem = (field, value) => {
    setProfile((prev) => {
      if (value === 'None yet') {
        return { ...prev, [field]: prev[field].includes('None yet') ? [] : ['None yet'] };
      }
      const filtered = prev[field].filter((i) => i !== 'None yet');
      return {
        ...prev,
        [field]: filtered.includes(value)
          ? filtered.filter((item) => item !== value)
          : [...filtered, value]
      };
    });
  };

  const toggleEmpBadge = (badge) => {
    setEmpRequiredBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  };

  const scrollToSection = (num) => {
    setActiveSection(num);
    const el = document.getElementById(`section-0${num}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAuthModal = (defaultTab = 'login') => {
    setAuthTab(defaultTab);
    setAuthError('');
    setAuthSuccess('');
    setAuthForm((prev) => ({
      ...prev,
      fullName: profile.fullName || prev.fullName,
      email: profile.email || prev.email,
      dob: profile.dob || prev.dob
    }));
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSavedWorkers([]);
    setJobOffers([]);
    setProfile({
      fullName: '',
      email: '',
      mobile: '',
      dob: '',
      gender: '',
      education: '',
      city: '',
      targetPay: '₱610',
      tracks: [],
      customSkills: '',
      workExperience: '',
      gear: [],
      badges: []
    });
    setDobError('');
    setSetupFeedback('');
    localStorage.removeItem('si_user_session');
    setMessages([DEFAULT_WELCOME_MSG]);
    navigateToView('setup');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    const normalizedEmail = authForm.email.trim().toLowerCase();
    const vaultEntry = getAccountVault()[normalizedEmail];

    try {
      let res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: authForm.password
        })
      });

      // If backend restarted and lost the account, restore from local vault if credentials match
      if (res.status === 401 && vaultEntry && vaultEntry.passwordPlain === authForm.password) {
        const syncRes = await fetch(`${API_BASE}/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: vaultEntry.user,
            workerProfile: vaultEntry.workerProfile,
            chatHistory: vaultEntry.chatHistory || []
          })
        });
        if (syncRes.ok) {
          const syncedData = await syncRes.json();
          setCurrentUser(syncedData.user);
          if (syncedData.workerProfile) {
            setProfile((prev) => ({ ...prev, ...syncedData.workerProfile }));
          }
          if (syncedData.chatHistory?.length > 0) {
            setMessages([DEFAULT_WELCOME_MSG, ...syncedData.chatHistory]);
          } else {
            setMessages([DEFAULT_WELCOME_MSG]);
          }
          localStorage.setItem('si_user_session', JSON.stringify(syncedData));
          setAuthModalOpen(false);
          navigateToView(syncedData.user.role === 'employer' ? 'employer' : 'card');
          setAuthLoading(false);
          return;
        }
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server returned non-JSON response. Make sure the backend server is running.');
      }

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Sign in failed. Please check your email and password.');
        setAuthLoading(false);
        return;
      }

      setCurrentUser(data.user);
      if (data.workerProfile) {
        setProfile((prev) => ({ ...prev, ...data.workerProfile }));
      } else if (data.user.role === 'worker') {
        setProfile((prev) => ({
          ...prev,
          fullName: prev.fullName || data.user.fullName || '',
          email: prev.email || data.user.email || '',
          dob: prev.dob || data.user.dob || ''
        }));
      }

      if (data.chatHistory?.length > 0) {
        setMessages([DEFAULT_WELCOME_MSG, ...data.chatHistory]);
      } else {
        setMessages([DEFAULT_WELCOME_MSG]);
      }

      saveToAccountVault(normalizedEmail, {
        user: data.user,
        passwordPlain: authForm.password,
        workerProfile: data.workerProfile || null,
        chatHistory: data.chatHistory || []
      });

      if (data.user.role === 'employer') {
        setOfferForm((prev) => ({
          ...prev,
          recruiterName: data.user.recruiterName || prev.recruiterName,
          companyName: data.user.companyName || prev.companyName
        }));
        navigateToView('employer');
      } else {
        navigateToView('card');
      }

      localStorage.setItem('si_user_session', JSON.stringify(data));
      setAuthModalOpen(false);
    } catch (err) {
      setAuthError(err.message || 'Could not connect to server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWorkerSignupSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const signupAge = computeAgeFromDob(authForm.dob);
    if (signupAge === null || signupAge < 18) {
      setAuthError('Applicants must be at least 18 years old to register and apply for jobs.');
      return;
    }

    setAuthLoading(true);
    try {
      const normalizedEmail = authForm.email.trim().toLowerCase();
      const res = await fetch(`${API_BASE}/api/auth/signup-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: authForm.fullName.trim(),
          email: normalizedEmail,
          password: authForm.password,
          dob: authForm.dob,
          profile: {
            ...profile,
            fullName: authForm.fullName.trim(),
            email: normalizedEmail,
            dob: authForm.dob
          }
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server returned non-JSON response. Make sure the backend server is running.');
      }

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Sign up failed.');
        setAuthLoading(false);
        return;
      }

      const updatedProfile = {
        ...profile,
        ...(data.workerProfile || {}),
        userId: data.user.id,
        fullName: authForm.fullName.trim(),
        email: normalizedEmail,
        dob: authForm.dob
      };

      const sessionPayload = {
        ...data,
        workerProfile: updatedProfile,
        chatHistory: messages.slice(1)
      };

      setCurrentUser(data.user);
      setProfile(updatedProfile);
      localStorage.setItem('si_user_session', JSON.stringify(sessionPayload));
      saveToAccountVault(normalizedEmail, {
        user: data.user,
        passwordPlain: authForm.password,
        workerProfile: updatedProfile,
        chatHistory: messages.slice(1)
      });

      setAuthModalOpen(false);
      navigateToView('card');
    } catch (err) {
      setAuthError(err.message || 'Could not connect to server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmployerRequestSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/request-employer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterName: authForm.recruiterName.trim(),
          companyName: authForm.companyName.trim(),
          workEmail: authForm.email.trim(),
          contactNumber: authForm.contactNumber.trim(),
          businessPermitInfo: authForm.businessPermitInfo.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Could not submit verification request.');
        setAuthLoading(false);
        return;
      }
      setAuthSuccess(data.message || 'Verification request submitted!');
    } catch {
      setAuthError('Could not connect to server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const saveProfileAndContinue = async () => {
    setDobError('');
    setSetupFeedback('');

    if (!profile.fullName.trim()) {
      setSetupFeedback('Please enter your Full Name in Section 01 before finding matches.');
      scrollToSection(1);
      return;
    }

    if (!profile.dob) {
      const msg = 'Please enter your Date of Birth before continuing.';
      setDobError(msg);
      setSetupFeedback(msg);
      scrollToSection(1);
      return;
    }

    const age = computeAgeFromDob(profile.dob);
    if (age === null || age < 18) {
      const msg = 'You must be at least 18 years old to apply for jobs on Skill: Issued!.';
      setDobError(msg);
      setSetupFeedback(msg);
      scrollToSection(1);
      return;
    }

    const normalizedProfile = {
      ...profile,
      fullName: profile.fullName.trim(),
      email: profile.email.trim(),
      mobile: profile.mobile.trim(),
      city: profile.city.trim() || 'Quezon City',
      tracks: profile.tracks.length ? profile.tracks : ['General Shift Help'],
      customSkills: profile.customSkills.trim() || 'Ready for immediate shift',
      workExperience: profile.workExperience.trim() || 'Entry-level / First-time jobseeker',
      age
    };

    setProfile(normalizedProfile);

    // Only persist to backend employer database if the user has a registered account
    if (currentUser?.id) {
      try {
        const res = await fetch(`${API_BASE}/api/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            ...normalizedProfile
          })
        });
        if (res.ok) {
          const data = await res.json();
          const savedWorker = data.worker || { ...normalizedProfile, userId: currentUser.id };
          const updatedSession = {
            user: currentUser,
            workerProfile: savedWorker,
            chatHistory: messages.slice(1)
          };
          localStorage.setItem('si_user_session', JSON.stringify(updatedSession));
          saveToAccountVault(currentUser.email, {
            user: currentUser,
            workerProfile: savedWorker,
            chatHistory: messages.slice(1)
          });
        }
      } catch (err) {
        console.error('Failed to save profile:', err);
      }
    }

    navigateToView('card');
  };

  const sendMessage = async (customPrompt) => {
    const isSampleLocked = !currentUser && !profile.fullName.trim();
    if (isSampleLocked) return;

    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;
    if (!customPrompt) setInput('');

    const updatedMessages = [...messages, { role: 'user', text: textToSend }];
    setMessages(updatedMessages);
    setLoading(true);

    const activeWorkerProfile = {
      ...profile,
      fullName: profile.fullName.trim() || currentUser?.fullName || 'Worker',
      email: profile.email.trim() || currentUser?.email || '',
      age: computeAgeFromDob(profile.dob) || 20
    };

    try {
      const historyForApi = updatedMessages.slice(1, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          workerProfile: activeWorkerProfile,
          userMessage: textToSend,
          chatHistory: historyForApi
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server is not responding with JSON. Make sure the backend server is running.');
      }

      const data = await res.json();
      const finalMessages = [
        ...updatedMessages,
        {
          role: 'model',
          text: data.reply || `Server Error: ${data.error || 'No response returned from server.'}`
        }
      ];
      setMessages(finalMessages);

      if (currentUser) {
        const persistedChat = finalMessages.slice(1);
        localStorage.setItem(
          'si_user_session',
          JSON.stringify({
            user: currentUser,
            workerProfile: profile,
            chatHistory: persistedChat
          })
        );
        saveToAccountVault(currentUser.email, {
          user: currentUser,
          workerProfile: profile,
          chatHistory: persistedChat
        });
      }
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: 'model',
          text: `Connection error: ${err.message || 'Please make sure the backend server is running.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatInlineMarkdown = (line) => {
    const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+|\*\*[^*]+\*\*)/g;
    const parts = line.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (mdLinkMatch) {
        return (
          <a
            key={idx}
            href={mdLinkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#6951C8',
              background: '#F3EFFB',
              padding: '2px 8px',
              borderRadius: '6px',
              textDecoration: 'underline',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            {mdLinkMatch[1]} ↗
          </a>
        );
      }

      if (/^https?:\/\//i.test(part)) {
        const cleanUrl = part.replace(/[.,;:!?]+$/, '');
        const trailingPunct = part.slice(cleanUrl.length);
        let label = 'View Job / Link';
        try {
          const hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
          label = `Open on ${hostname}`;
        } catch {
          label = 'Open Link';
        }

        return (
          <span key={idx}>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#6951C8',
                background: '#F3EFFB',
                padding: '2px 8px',
                borderRadius: '6px',
                textDecoration: 'underline',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              {label} ↗
            </a>
            {trailingPunct}
          </span>
        );
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} style={{ color: '#29223B', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }

      return part;
    });
  };

  const renderMessageWithLinks = (text) => {
    const lines = text.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} style={{ height: '6px' }} />;

          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#{2,3}\s+/, '');
            return (
              <div
                key={i}
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#443579',
                  marginTop: i === 0 ? '0px' : '10px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #ECEEF3'
                }}
              >
                {formatInlineMarkdown(headingText)}
              </div>
            );
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const bulletContent = trimmed.replace(/^[\*\-]\s+/, '');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '4px' }}>
                <span style={{ color: '#6951C8', fontWeight: 700, lineHeight: '1.5' }}>•</span>
                <div style={{ flex: 1, lineHeight: '1.55' }}>{formatInlineMarkdown(bulletContent)}</div>
              </div>
            );
          }

          return (
            <div key={i} style={{ lineHeight: '1.6' }}>
              {formatInlineMarkdown(trimmed)}
            </div>
          );
        })}
      </div>
    );
  };

  const isVerifiedEmployer = currentUser?.role === 'employer' && currentUser?.verified;
  const registeredSavedWorkers = savedWorkers.filter((w) => Boolean(w.userId));
  const allWorkers = isVerifiedEmployer ? [...registeredSavedWorkers, ...SAMPLE_WORKERS] : [];

  const filteredWorkers = allWorkers.filter((w) => {
    const matchesSearch =
      !empSearch.trim() ||
      w.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
      w.customSkills.toLowerCase().includes(empSearch.toLowerCase()) ||
      w.workExperience.toLowerCase().includes(empSearch.toLowerCase());

    const matchesCity = !empCity.trim() || w.city.toLowerCase().includes(empCity.toLowerCase());
    const matchesTrack = empTrack === 'All' || w.tracks.includes(empTrack);
    const matchesBadges = empRequiredBadges.every((reqBadge) => w.badges.includes(reqBadge));

    const workerAge = Number(w.age) || computeAgeFromDob(w.dob) || 0;
    const matchesAgeBracket =
      empAgeBracket === 'All' ||
      (empAgeBracket === '18-24' && workerAge >= 18 && workerAge <= 24) ||
      (empAgeBracket === '25-34' && workerAge >= 25 && workerAge <= 34) ||
      (empAgeBracket === '35-44' && workerAge >= 35 && workerAge <= 44) ||
      (empAgeBracket === '45+' && workerAge >= 45);

    return matchesSearch && matchesCity && matchesTrack && matchesBadges && matchesAgeBracket;
  });

  const handleSendStructuredOffer = async () => {
    if (!selectedWorker) return;
    setOfferFeedback('');

    if (!isVerifiedEmployer) {
      setOfferFeedback('Only verified employer accounts can send job offers. Please sign in as a verified employer.');
      return;
    }

    if (!selectedWorker.userId && !selectedWorker.isSample) {
      setOfferFeedback('Offers can only be sent to workers with a registered Skill: Issued! account.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId: currentUser.id,
          workerId: selectedWorker.id,
          workerName: selectedWorker.fullName,
          workerEmail: selectedWorker.email,
          recruiterName: offerForm.recruiterName,
          companyName: offerForm.companyName,
          jobTitle: offerForm.jobTitle,
          salary: offerForm.salary,
          workingHours: offerForm.workingHours,
          benefits: offerForm.benefits,
          note: offerForm.note
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setOfferFeedback(data.error || 'Could not send job offer.');
        return;
      }

      const myOffers = Array.isArray(data.offers)
        ? data.offers.filter((o) => o.employerId === currentUser.id)
        : [];
      setJobOffers(myOffers);
      setOfferFeedback('Official job offer sent! Tracked under the "Sent Offers" tab.');
    } catch {
      setOfferFeedback('Connection error. Please make sure the backend server is running.');
    }
  };

  const handleOfferReplyOrStatus = async (offerId, statusUpdate = null) => {
    const replyText = offerReplyInputs[offerId] || '';
    if (!statusUpdate && !replyText.trim()) return;

    const senderRole = currentUser?.role === 'employer' ? 'employer' : 'worker';
    const senderName =
      currentUser?.role === 'employer'
        ? currentUser.recruiterName || currentUser.companyName
        : currentUser?.fullName || profile.fullName || 'Worker';

    try {
      const res = await fetch(`${API_BASE}/api/offers/${offerId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole,
          senderName,
          text: replyText,
          status: statusUpdate
        })
      });
      const data = await res.json();
      if (res.ok && data.offer) {
        setJobOffers((prev) => prev.map((o) => (o.id === offerId ? data.offer : o)));
        setOfferReplyInputs((prev) => ({ ...prev, [offerId]: '' }));
      }
    } catch (err) {
      console.error('Failed to update offer:', err);
    }
  };

  // =========================================================================
  // GLOBAL STYLES (PASTEL FOLDER-TAB THEME + SMOOTH PAGE TRANSITIONS)
  // =========================================================================
  const globalStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Inter:wght@400;500;600;700&display=swap');

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #FAFBFD; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #29223B; }
      .si-page { min-height: 100vh; display: flex; flex-direction: column; background: #FAFBFD; }
      .si-display-font { font-family: 'Fraunces', Georgia, serif; }

      /* Smooth Page & Card Transitions */
      @keyframes siPageEnter {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes siModalPop {
        0% {
          opacity: 0;
          transform: scale(0.97) translateY(8px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      .si-view-enter {
        animation: siPageEnter 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .si-modal-enter {
        animation: siModalPop 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      /* Header */
      .si-nav { width: 100%; min-height: 104px; background: #FFFFFF; border-bottom: 1px solid #ECEEF3; display: flex; align-items: center; justify-content: center; padding: 12px 32px; position: sticky; top: 0; z-index: 40; }
      .si-nav-inner { width: 100%; max-width: 1376px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .si-nav-left { display: flex; align-items: center; gap: 44px; }
      .si-nav-tiles { display: flex; align-items: center; gap: 28px; }
      .si-nav-tile {
        position: relative;
        width: 130px;
        height: 50px;
        border-radius: 6px;
        border: 1px solid transparent;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 11px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        line-height: 15px;
        color: #29223B;
        cursor: pointer;
        transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .si-nav-tile:hover {
        border: 1px solid rgba(105, 81, 200, 0.35);
        box-shadow: 0px 3px 10px rgba(105, 81, 200, 0.18);
        transform: translateY(-2px);
      }
      .si-nav-tile.active {
        border: 1.5px solid #6951C8;
        box-shadow: 0px 3px 10px rgba(105, 81, 200, 0.18);
        transform: translateY(-1px);
      }

      .si-nav-right { display: flex; align-items: center; gap: 12px; }
      .si-outline-btn {
        height: 44px;
        padding: 0 22px;
        border-radius: 6px;
        background: #FFFFFF;
        border: 1px solid #D5CEE8;
        color: #574192;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        line-height: 15px;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .si-outline-btn:hover {
        background: rgba(105, 81, 200, 0.06);
        border-color: rgba(105, 81, 200, 0.45);
        box-shadow: 0px 3px 10px rgba(105, 81, 200, 0.16);
      }

      /* Sign-up prompt banner */
      .si-auth-banner {
        width: 100%;
        max-width: 1376px;
        margin: 22px auto 0;
        padding: 0 32px;
      }
      .si-auth-banner-inner {
        background: #FFF7CC;
        border: 1px solid #F3E29B;
        box-shadow: 0px 3px 10px rgba(105, 81, 200, 0.08);
        border-radius: 12px;
        padding: 14px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 14px;
      }

      /* Main Layout */
      .si-main { width: 100%; max-width: 1376px; margin: 28px auto; padding: 0 32px; display: grid; grid-template-columns: 332px 1fr; gap: 32px; align-items: start; flex: 1; }
      .si-card-split { width: 100%; max-width: 1376px; margin: 24px auto 36px; padding: 0 32px; display: grid; grid-template-columns: 440px 1fr; gap: 32px; align-items: start; flex: 1; }
      @media (max-width: 1120px) { .si-main, .si-card-split { grid-template-columns: 1fr; } .si-nav-tiles { display: none; } }

      /* Left Sidebar */
      .si-sidebar { position: sticky; top: 120px; display: flex; flex-direction: column; gap: 20px; }
      .si-guide-card { background: #FFFFFF; border: 1px solid #E5E8ED; border-radius: 16px; padding: 24px 16px 20px; }
      .si-guide-header { padding: 0 10px; }
      .si-guide-title { font-family: 'Fraunces', Georgia, serif; font-weight: 800; font-size: 21px; line-height: 26px; color: #F294D0; }
      .si-guide-sub { margin-top: 4px; font-weight: 600; font-size: 12px; line-height: 16px; color: #4B5563; }
      .si-step-list { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
      .si-step-btn { width: 100%; height: 58px; padding: 0 12px; border-radius: 10px; border: 1px solid transparent; background: transparent; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
      .si-step-btn:hover { background: #FFFDF0; border-color: #F3E59A; }
      .si-step-btn.active { background: #FFF9D6; border-color: #F4E7A1; }
      .si-step-num { width: 32px; height: 32px; border-radius: 16px; background: #EAECEF; color: #6C7481; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .si-step-btn.active .si-step-num { background: #B8B3F2; color: #FFFFFF; }
      .si-step-title { font-weight: 700; font-size: 13px; line-height: 16px; color: #29223B; }
      .si-step-desc { margin-top: 3px; font-weight: 400; font-size: 11px; line-height: 13px; color: #697381; }

      .si-reassure { background: #FFF9D6; border-radius: 16px; padding: 22px; }
      .si-reassure-title { font-family: 'Fraunces', Georgia, serif; font-weight: 800; font-size: 17px; line-height: 22px; color: #F294D0; }
      .si-reassure-body { margin-top: 10px; font-weight: 400; font-size: 13px; line-height: 20px; color: #E287C0; }

      /* Folder Tab Cards */
      .si-cards { display: flex; flex-direction: column; gap: 28px; }
      .si-folder-wrap { position: relative; transition: transform 0.2s ease; }
      .si-folder-tab {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px 10px 16px;
        border-radius: 16px 16px 0 0;
      }
      .si-folder-badge {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: #B8B3F2;
        color: #FFFFFF;
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .si-folder-title {
        font-family: 'Fraunces', Georgia, serif;
        font-weight: 800;
        font-size: 19px;
        line-height: 24px;
        color: #F294D0;
      }
      .si-folder-body {
        border-radius: 0 18px 18px 18px;
        padding: 24px 28px 28px;
      }

      /* Yellow Section 01 */
      .si-sec-yellow .si-folder-tab,
      .si-sec-yellow .si-folder-body { background: #FFF7CC; }

      /* Lilac-Pink Section 02 */
      .si-sec-pink .si-folder-tab,
      .si-sec-pink .si-folder-body { background: #FCE6FA; }

      /* Aqua Section 03 */
      .si-sec-aqua .si-folder-tab,
      .si-sec-aqua .si-folder-body { background: #DDFBF9; }

      /* Mint Section 04 */
      .si-sec-mint .si-folder-tab,
      .si-sec-mint .si-folder-body { background: #CBF5EA; }

      .si-card { background: #FFFFFF; border: 1px solid #E5E8ED; border-radius: 16px; padding: 26px 28px; transition: box-shadow 0.2s ease, transform 0.2s ease; }
      .si-card:hover { box-shadow: 0 6px 20px rgba(41, 34, 59, 0.05); }
      .si-card-sub { font-weight: 500; font-size: 13px; line-height: 18px; color: #525B6B; margin-bottom: 18px; }

      .si-label { display: block; font-weight: 600; font-size: 12px; line-height: 15px; color: #374151; margin-bottom: 8px; }
      .si-input { width: 100%; height: 46px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 8px; padding: 0 15px; font-family: inherit; font-size: 13px; color: #29223B; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      .si-input::placeholder { color: #8A93A2; }
      .si-input:focus { border-color: #B8B3F2; box-shadow: 0 0 0 3px rgba(184, 179, 242, 0.25); }

      .si-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      @media (max-width: 768px) { .si-grid-3 { grid-template-columns: 1fr; } }

      .si-phone-wrap { width: 100%; height: 46px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 8px; padding: 0 15px; display: flex; align-items: center; }
      .si-phone-wrap:focus-within { border-color: #B8B3F2; }
      .si-phone-prefix { font-weight: 600; font-size: 13px; color: #374151; }
      .si-phone-div { width: 1px; height: 22px; background: #E1E4EA; margin: 0 12px; }
      .si-phone-input { border: none; background: transparent; width: 100%; font-family: inherit; font-size: 13px; color: #29223B; outline: none; }
      .si-phone-input::placeholder { color: #8A93A2; }

      .si-pill-btn { height: 34px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 7px; font-family: inherit; font-weight: 500; font-size: 12px; color: #4B5563; cursor: pointer; padding: 0 18px; transition: all 0.15s ease; }
      .si-pill-btn:hover { border-color: #B8B3F2; background: #F9F8FF; }
      .si-pill-btn.selected { background: #F3EFFB; border-color: #6951C8; color: #574192; font-weight: 600; }

      .si-loc-grid { display: grid; grid-template-columns: 310px 1fr; gap: 24px; align-items: start; }
      @media (max-width: 900px) { .si-loc-grid { grid-template-columns: 1fr; } }
      .si-pay-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      @media (max-width: 600px) { .si-pay-cards { grid-template-columns: 1fr; } }
      .si-pay-card { position: relative; height: 76px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 10px; padding: 13px 14px; text-align: left; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
      .si-pay-card:hover { border-color: #B8B3F2; }
      .si-pay-card.selected { background: #F8F3FF; border: 1.5px solid #6951C8; }
      .si-pay-radio { position: absolute; right: 14px; top: 14px; width: 16px; height: 16px; border-radius: 8px; background: #FFFFFF; border: 1px solid #C5CBD5; display: flex; align-items: center; justify-content: center; }
      .si-pay-card.selected .si-pay-radio { border-color: #6951C8; background: #6951C8; }
      .si-pay-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF; }
      .si-pay-amt { font-weight: 700; font-size: 19px; line-height: 23px; color: #29223B; }
      .si-pay-sub { margin-top: 6px; font-weight: 400; font-size: 11px; line-height: 13px; color: #697381; }
      .si-helper-text { margin-top: 10px; font-weight: 400; font-size: 11px; line-height: 13px; color: #697381; }

      .si-chip-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
      .si-chip { height: 36px; padding: 0 18px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 7px; font-family: inherit; font-weight: 500; font-size: 12px; color: #4B5563; cursor: pointer; transition: all 0.15s ease; }
      .si-chip:hover { border-color: #6951C8; color: #574192; }
      .si-chip.selected { background: #F3EFFB; border-color: #6951C8; color: #574192; font-weight: 600; }

      .si-textarea-lg { width: 100%; height: 96px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 10px; padding: 14px 16px; font-family: inherit; font-size: 13px; color: #29223B; resize: none; outline: none; }
      .si-textarea-lg::placeholder { color: #8A93A2; }
      .si-textarea-lg:focus { border-color: #6951C8; }

      .si-badge-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
      @media (max-width: 720px) { .si-badge-grid { grid-template-columns: 1fr; } }
      .si-doc-card { position: relative; height: 92px; background: #FFFFFF; border: 1px solid #E2E5EC; border-radius: 10px; padding: 18px; cursor: pointer; user-select: none; transition: all 0.15s ease; }
      .si-doc-card.checked { background: #F8F5FF; border: 1.5px solid #6951C8; }
      .si-doc-top { display: flex; align-items: flex-start; gap: 12px; }
      .si-checkbox { width: 18px; height: 18px; background: #FFFFFF; border: 1px solid #C5BDDA; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
      .si-doc-card.checked .si-checkbox { background: #6951C8; border-color: #6951C8; color: #FFFFFF; }
      .si-doc-name { font-weight: 700; font-size: 14px; line-height: 17px; color: #29223B; }
      .si-doc-sub { margin-top: 9px; font-weight: 400; font-size: 12px; line-height: 15px; color: #6F6580; }
      .si-doc-status { position: absolute; right: 16px; bottom: 14px; height: 22px; padding: 0 12px; background: #F0EDF6; border-radius: 5px; font-weight: 600; font-size: 10px; color: #75668B; display: flex; align-items: center; }
      .si-doc-card.checked .si-doc-status { background: #6951C8; color: #FFFFFF; }
      .si-doc-disclaimer { margin-top: 18px; font-weight: 400; font-size: 11px; color: #525B6B; }

      /* Bottom CTA Banner */
      .si-cta-box { background: #FFF7CC; border-radius: 14px; padding: 22px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
      .si-cta-title { font-weight: 700; font-size: 16px; line-height: 20px; color: #29223B; }
      .si-cta-sub { margin-top: 4px; font-weight: 400; font-size: 12px; line-height: 16px; color: #525B6B; }
      .si-pink-cta-btn {
        height: 44px;
        padding: 0 38px;
        background: #F496D7;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-weight: 700;
        font-size: 13px;
        color: #FFFFFF;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .si-pink-cta-btn:hover { background: #E97DC8; box-shadow: 0 4px 12px rgba(244, 150, 215, 0.35); transform: translateY(-1px); }
      .si-pink-cta-btn:disabled { background: #D8C7D3; cursor: not-allowed; box-shadow: none; transform: none; }

      .si-purple-btn {
        height: 44px;
        padding: 0 28px;
        background: #6951C8;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-weight: 600;
        font-size: 13px;
        color: #FFFFFF;
        cursor: pointer;
      }
      .si-purple-btn:hover { background: #574192; }

      /* Clean Neutral Chat Bubbles */
      .si-chat-feed {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .si-chat-row {
        display: flex;
        width: 100%;
      }
      .si-chat-row.left { justify-content: flex-start; }
      .si-chat-row.right { justify-content: flex-end; }
      .si-chat-bubble {
        max-width: 78%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
      }
      .si-chat-bubble.incoming {
        background: #FFFFFF;
        color: #29223B;
        border: 1px solid #E3E7EC;
        border-bottom-left-radius: 4px;
      }
      .si-chat-bubble.outgoing {
        background: #F1F3F6;
        color: #29223B;
        border: 1px solid #E2E5EC;
        border-bottom-right-radius: 4px;
      }
      .si-chat-sender {
        font-size: 11px;
        font-weight: 600;
        color: #687281;
        margin-bottom: 4px;
      }
      .si-neutral-reply-btn {
        height: 42px;
        padding: 0 22px;
        background: #29223B;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease;
        flex-shrink: 0;
      }
      .si-neutral-reply-btn:hover { background: #3E3556; }

      .si-footer { width: 100%; background: #FFFFFF; border-top: 1px solid #ECEEF3; padding: 20px 32px; margin-top: 48px; display: flex; justify-content: center; }
      .si-footer-inner { width: 100%; max-width: 1376px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
      .si-footer-links { display: flex; align-items: center; gap: 28px; font-size: 12px; color: #687281; }
    `}</style>
  );

  // =========================================================================
  // LOGO COMPONENT
  // =========================================================================
  const renderLogo = (small = false) => (
    <div
      onClick={() => navigateToView(isVerifiedEmployer ? 'employer' : 'setup')}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', userSelect: 'none' }}
    >
      <img
        src={logoImg}
        alt="Skill: Issued!"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.nextSibling) {
            e.currentTarget.nextSibling.style.display = 'inline-block';
          }
        }}
        style={{
          height: small ? '80px' : '80px',
          width: 'auto',
          objectFit: 'contain'
        }}
      />
      <span
        className="si-display-font"
        style={{
          display: 'none',
          fontSize: small ? '20px' : '26px',
          fontWeight: 800,
          color: '#F294D0'
        }}
      >
        Skill: Issued!
      </span>
    </div>
  );

  // =========================================================================
  // NAVBAR, FOOTER & AUTH MODAL
  // =========================================================================
  const pendingOffersCount = jobOffers.filter((o) => o.status === 'Pending Worker Response').length;

  const renderNavbar = () => (
    <header className="si-nav">
      <div className="si-nav-inner">
        <div className="si-nav-left">
          {renderLogo(false)}

          <nav className="si-nav-tiles">
            {isVerifiedEmployer ? (
              <>
                <button
                  type="button"
                  onClick={() => navigateToView('employer')}
                  className={`si-nav-tile ${view === 'employer' ? 'active' : ''}`}
                  style={{ background: '#DCFBF3' }}
                >
                  <span>Search for Workers</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('offers')}
                  className={`si-nav-tile ${view === 'offers' ? 'active' : ''}`}
                  style={{ background: '#FFF7CC' }}
                >
                  <span>Sent Offers</span>
                  {jobOffers.length > 0 && (
                    <span
                      style={{
                        marginTop: '4px',
                        background: '#6951C8',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '10px'
                      }}
                    >
                      {jobOffers.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('resources')}
                  className={`si-nav-tile ${view === 'resources' ? 'active' : ''}`}
                  style={{ background: '#FFE4EF' }}
                >
                  <span>Career Resources</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigateToView('setup')}
                  className={`si-nav-tile ${view === 'setup' ? 'active' : ''}`}
                  style={{ background: '#F8D5FA' }}
                >
                  <span>Worker Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('card')}
                  className={`si-nav-tile ${view === 'card' ? 'active' : ''}`}
                  style={{ background: '#FFF7CC' }}
                >
                  <span>Skill Card & AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('offers')}
                  className={`si-nav-tile ${view === 'offers' ? 'active' : ''}`}
                  style={{ background: '#DCFBF3' }}
                >
                  <span>Job Offers</span>
                  {pendingOffersCount > 0 && (
                    <span
                      style={{
                        marginTop: '4px',
                        background: '#6951C8',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '10px'
                      }}
                    >
                      {pendingOffersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('resources')}
                  className={`si-nav-tile ${view === 'resources' ? 'active' : ''}`}
                  style={{ background: '#FFE4EF' }}
                >
                  <span>Career Resources</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="si-nav-right">
          {!isVerifiedEmployer && (
            <button
              type="button"
              onClick={() => navigateToView('employer')}
              className="si-outline-btn"
              style={{
                background: view === 'employer' ? '#F3EFFB' : '#FFFFFF',
                borderColor: view === 'employer' ? '#6951C8' : '#D5CEE8'
              }}
            >
              Sign in as Employer
            </button>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#F3EFFB',
                  color: '#443579',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #D5CEE8'
                }}
              >
                {currentUser.role === 'employer'
                  ? `🏢 ${currentUser.companyName}`
                  : `👤 ${currentUser.fullName}`}
              </span>
              <button type="button" onClick={handleLogout} className="si-outline-btn">
                Log out
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => openAuthModal('login')} className="si-outline-btn">
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className="si-footer">
      <div className="si-footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {renderLogo(true)}
          <span style={{ fontSize: '12px', color: '#687281' }}>Slogan here</span>
        </div>
        <div className="si-footer-links">
          <span>About</span>
          <span>Help center</span>
          <span>Privacy</span>
          <span>© 2026 Skill: Issued!</span>
        </div>
      </div>
    </footer>
  );

  const renderAuthModal = () => {
    if (!authModalOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(41, 34, 59, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 60
        }}
      >
        <div
          className="si-modal-enter"
          style={{
            width: '100%',
            maxWidth: '500px',
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E3E7EC',
            overflow: 'hidden',
            boxShadow: '0 18px 44px rgba(41, 34, 59, 0.2)'
          }}
        >
          <div
            style={{
              background: '#FCE6FA',
              color: '#29223B',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #F3D1F0'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7A659E', fontWeight: 700 }}>
                Skill: Issued! Account Portal
              </div>
              <div className="si-display-font" style={{ fontSize: '21px', fontWeight: 800, color: '#F294D0', marginTop: '2px' }}>
                {authTab === 'login' && 'Sign in to your account'}
                {authTab === 'signup-worker' && 'Create a Worker Account'}
                {authTab === 'request-employer' && 'Employer Verification Request'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E5EC',
                color: '#4B5563',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #ECEEF3', background: '#FAFBFD' }}>
            {[
              { id: 'login', label: 'Sign In' },
              { id: 'signup-worker', label: 'Worker Sign Up' },
              { id: 'request-employer', label: 'Employer Request' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setAuthTab(t.id);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                style={{
                  flex: 1,
                  padding: '13px 10px',
                  fontSize: '12px',
                  fontWeight: authTab === t.id ? 700 : 500,
                  color: authTab === t.id ? '#6951C8' : '#687281',
                  background: authTab === t.id ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderBottom: authTab === t.id ? '2px solid #F496D7' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '22px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
            {authError && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '11px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                ⚠️ {authError}
              </div>
            )}

            {authSuccess && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '12px 14px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  borderRadius: '8px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  fontWeight: 500
                }}
              >
                ✅ {authSuccess}
              </div>
            )}

            {authTab === 'login' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="si-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Password</label>
                  <input
                    type="password"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" disabled={authLoading} className="si-pink-cta-btn" style={{ width: '100%', marginTop: '4px' }}>
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>

                <div
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    background: '#FFF7CC',
                    border: '1px solid #F3E29B',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#5C4A1E'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    Sample Verified Employer (Jollibee Foods Corp)
                  </div>
                  <div>Email: <code>hr.manager@jollibee.com.ph</code></div>
                  <div>Password: <code>Jollibee2026!</code></div>
                  <button
                    type="button"
                    onClick={() =>
                      setAuthForm({
                        ...authForm,
                        email: 'hr.manager@jollibee.com.ph',
                        password: 'Jollibee2026!'
                      })
                    }
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: '#6951C8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Auto-Fill Jollibee Hiring Manager Login
                  </button>
                </div>
              </form>
            )}

            {authTab === 'signup-worker' && (
              <form onSubmit={handleWorkerSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="si-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="e.g. Juan Dela Cruz"
                    value={authForm.fullName}
                    onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Date of Birth (Must be 18 or older)</label>
                  <input
                    type="date"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    value={authForm.dob}
                    onChange={(e) => setAuthForm({ ...authForm, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Create Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="Minimum 6 characters"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={authLoading} className="si-pink-cta-btn" style={{ width: '100%', marginTop: '4px' }}>
                  {authLoading ? 'Creating Account...' : 'Create Account & Save Skill Card'}
                </button>
              </form>
            )}

            {authTab === 'request-employer' && (
              <form onSubmit={handleEmployerRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    background: '#DDFBF9',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#115E59',
                    lineHeight: '1.5'
                  }}
                >
                  Companies must send a verification request and official company email before being verified to send job offers to workers.
                </div>
                <div>
                  <label className="si-label">Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="e.g. Jollibee Foods Corporation"
                    value={authForm.companyName}
                    onChange={(e) => setAuthForm({ ...authForm, companyName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Recruiter / Hiring Manager Full Name & Role</label>
                  <input
                    type="text"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="e.g. Maria Clara Reyes — HR Manager"
                    value={authForm.recruiterName}
                    onChange={(e) => setAuthForm({ ...authForm, recruiterName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Official Company Email</label>
                  <input
                    type="email"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="hr@yourcompany.com.ph"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">SEC / DTI Registration or Store Branch Details</label>
                  <input
                    type="text"
                    required
                    className="si-input"
                    style={{ height: '42px' }}
                    placeholder="e.g. SEC Reg. No. or Branch Address"
                    value={authForm.businessPermitInfo}
                    onChange={(e) => setAuthForm({ ...authForm, businessPermitInfo: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={authLoading} className="si-pink-cta-btn" style={{ width: '100%', marginTop: '4px' }}>
                  {authLoading ? 'Submitting...' : 'Send Verification Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // PART 1: WORKER PROFILE SETUP
  // =========================================================================
  if (view === 'setup') {
    return (
      <div className="si-page">
        {globalStyles}
        {renderNavbar()}
        {renderAuthModal()}

        <main key="view-setup" className="si-main si-view-enter">
          <aside className="si-sidebar">
            <div className="si-guide-card">
              <div className="si-guide-header">
                <div className="si-guide-title">Let’s Get to Know You!</div>
                <div className="si-guide-sub">Operation: Be Employed</div>
              </div>

              <div className="si-step-list">
                {[
                  { num: 1, title: 'About You' },
                  { num: 2, title: 'Location & Desired Pay' },
                  { num: 3, title: 'Job Interest and Expereince' },
                  { num: 4, title: 'Required Documents' }
                ].map((item) => (
                  <button
                    key={item.num}
                    type="button"
                    onClick={() => scrollToSection(item.num)}
                    className={`si-step-btn ${activeSection === item.num ? 'active' : ''}`}
                  >
                    <span className="si-step-num">{item.num}</span>
                    <div>
                      <div className="si-step-title">{item.title}</div>
                      {item.desc && <div className="si-step-desc">{item.desc}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="si-reassure">
              <div className="si-reassure-title">We find skills and jobs perfectly you.</div>
              <div className="si-reassure-body">
                No experience yet? Indicate your skills and strengths and we will work from there.
              </div>
            </div>
          </aside>

          <div className="si-cards">
            {/* 01 — PERSONAL INFORMATION */}
            <section id="section-01" className="si-folder-wrap si-sec-yellow" onFocus={() => setActiveSection(1)}>
              <div className="si-folder-tab">
                <span className="si-folder-badge">01</span>
                <h2 className="si-folder-title">Personal Information</h2>
              </div>

              <div className="si-folder-body">
                <div className="si-grid-3">
                  <div>
                    <label className="si-label">Full Name *</label>
                    <input
                      type="text"
                      className="si-input"
                      placeholder="Enter your full name"
                      value={profile.fullName}
                      onChange={(e) => {
                        setSetupFeedback('');
                        setProfile({ ...profile, fullName: e.target.value });
                      }}
                    />
                  </div>

                  <div>
                    <label className="si-label">Email Address</label>
                    <input
                      type="email"
                      className="si-input"
                      placeholder="you@example.com"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="si-label">Phone Number (optional)</label>
                    <div className="si-phone-wrap">
                      <span className="si-phone-prefix">+63</span>
                      <span className="si-phone-div" />
                      <input
                        type="tel"
                        className="si-phone-input"
                        placeholder="9XX XXX XXXX"
                        value={profile.mobile}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ flex: '1 1 320px', maxWidth: '420px' }}>
                    <label className="si-label">Date of Birth * (Must be 18 or older to apply)</label>
                    <input
                      type="date"
                      className="si-input"
                      value={profile.dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setDobError('');
                        setSetupFeedback('');
                        setProfile({ ...profile, dob: e.target.value });
                      }}
                    />
                    {computedAge !== null && !isUnder18 && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                        ✓ Age: {computedAge} years old (Eligible to apply)
                      </div>
                    )}
                    {(isUnder18 || dobError) && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '9px 12px',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#991B1B',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        🚫 {dobError || `You are ${computedAge} years old. Applicants under 18 cannot apply.`}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="si-label">Gender (optional)</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {['Female', 'Male', 'Other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setProfile({ ...profile, gender: g })}
                          className={`si-pill-btn ${profile.gender === g ? 'selected' : ''}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label className="si-label">Highest Degree or Level of Education</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      'Working Student',
                      'High School Diploma',
                      "Bachelor's Degree",
                      'Masters/Doctorate Degree',
                      'Other'
                    ].map((edu) => (
                      <button
                        key={edu}
                        type="button"
                        onClick={() => setProfile({ ...profile, education: edu })}
                        className={`si-pill-btn ${profile.education === edu ? 'selected' : ''}`}
                      >
                        {edu}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 02 — LOCATION & DESIRED PAY */}
            <section id="section-02" className="si-folder-wrap si-sec-pink" onFocus={() => setActiveSection(2)}>
              <div className="si-folder-tab">
                <span className="si-folder-badge">02</span>
                <h2 className="si-folder-title">Location & Desired Pay</h2>
              </div>

              <div className="si-folder-body">
                <div className="si-loc-grid">
                  <div>
                    <label className="si-label">City / Area</label>
                    <input
                      type="text"
                      className="si-input"
                      placeholder="e.g. Quezon City, Cubao"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="si-label">Target Shift Pay (Minimum Day-Rate)</label>
                    <div className="si-pay-cards">
                      {[
                        { amount: '₱610', sub: 'Minimum Wage' },
                        { amount: '₱750+', sub: 'per day' },
                        { amount: '₱900+', sub: 'per day' }
                      ].map((rate) => {
                        const selected = profile.targetPay === rate.amount;
                        return (
                          <button
                            key={rate.amount}
                            type="button"
                            onClick={() => setProfile({ ...profile, targetPay: rate.amount })}
                            className={`si-pay-card ${selected ? 'selected' : ''}`}
                          >
                            <span className="si-pay-radio">
                              {selected && <span className="si-pay-dot" />}
                            </span>
                            <div className="si-pay-amt">{rate.amount}</div>
                            <div className="si-pay-sub">{rate.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="si-helper-text">Pick the lowest day-rate you’re comfortable accepting.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 03 — JOB INTEREST AND EXPERIENCE */}
            <section id="section-03" className="si-folder-wrap si-sec-aqua" onFocus={() => setActiveSection(3)}>
              <div className="si-folder-tab">
                <span className="si-folder-badge">03</span>
                <h2 className="si-folder-title">Job Interest and Experience</h2>
              </div>

              <div className="si-folder-body">
                <p className="si-card-sub">
                  Share your interests, past experience, and the things you can bring to work.
                </p>

                <div>
                  <label className="si-label">Type of job you want to apply for</label>
                  <div className="si-chip-wrap">
                    {[
                      'Food Service',
                      'Warehouse and Logistics',
                      'Retail and Promo',
                      'Digital and Technology',
                      'Education',
                      'Creative and Media',
                      'Office & admin',
                      'Other'
                    ].map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleItem('tracks', category)}
                        className={`si-chip ${profile.tracks.includes(category) ? 'selected' : ''}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '10px', color: '#697381', marginTop: '6px' }}>
                    Choose all that fit
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                  <div>
                    <label className="si-label">Current skills</label>
                    <textarea
                      className="si-textarea-lg"
                      placeholder="e.g. Customer service, cooking, stock handling, or using a computer"
                      value={profile.customSkills}
                      onChange={(e) => setProfile({ ...profile, customSkills: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="si-label">Work experience</label>
                    <textarea
                      className="si-textarea-lg"
                      placeholder="Tell us about your previous roles, responsibilities, or informal work."
                      value={profile.workExperience}
                      onChange={(e) => setProfile({ ...profile, workExperience: e.target.value })}
                    />
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#697381', marginTop: '4px' }}>
                      New to work? You can say so.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label className="si-label">Materials you already have for work</label>
                  <div className="si-chip-wrap">
                    {['Phone', 'Laptop', 'Work Clothes', 'Work shoes', 'None yet'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem('gear', item)}
                        className={`si-chip ${profile.gear.includes(item) ? 'selected' : ''}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 04 — YOUR DOCUMENT REQUIREMENTS */}
            <section id="section-04" className="si-folder-wrap si-sec-mint" onFocus={() => setActiveSection(4)}>
              <div className="si-folder-tab">
                <span className="si-folder-badge">04</span>
                <h2 className="si-folder-title">Recquired Documents</h2>
              </div>

              <div className="si-folder-body">
                <p className="si-card-sub">Indicate which documents you already have. Add the rest later.</p>

                <div className="si-badge-grid">
                  {[
                    'Barangay Clearance',
                    'Health Certificate',
                    'NBI Clearance',
                    'SSS / PhilHealth / Pag-IBIG'
                  ].map((docName) => {
                    const isChecked = profile.badges.includes(docName);
                    return (
                      <div
                        key={docName}
                        onClick={() => toggleItem('badges', docName)}
                        className={`si-doc-card ${isChecked ? 'checked' : ''}`}
                      >
                        <div className="si-doc-top">
                          <div className="si-checkbox">
                            {isChecked && (
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2.5 6L5 8.5L9.5 3.5"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="si-doc-name">{docName}</div>
                          </div>
                        </div>
                        <span className="si-doc-status">{isChecked ? 'Ready ✓' : 'Not marked'}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="si-doc-disclaimer">
                  These badges show what you have — they don’t mean your documents have been verified.
                </p>
              </div>
            </section>

            {setupFeedback && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                ⚠️ {setupFeedback}
              </div>
            )}

            <div className="si-cta-box">
              <div>
                <div className="si-cta-title">Ready!</div>
                <div className="si-cta-sub">
                  {isUnder18
                    ? 'Applicants under 18 years old cannot submit an application.'
                    : 'Chat with AI to see the best skill courses and job opportunities for you!'}
                </div>
              </div>
              <button
                type="button"
                disabled={isUnder18}
                onClick={saveProfileAndContinue}
                className="si-pink-cta-btn"
              >
                Start my career!
              </button>
            </div>
          </div>
        </main>

        {renderFooter()}
      </div>
    );
  }

  // =========================================================================
  // PART 2: DIGITAL SKILL CARD (LEFT) & ENGLISH AI CHAT BOX (RIGHT)
  // =========================================================================
  if (view === 'card') {
    const isUsingSampleCard = !currentUser && !profile.fullName.trim();
    const displayCard = isUsingSampleCard
      ? SAMPLE_WORKERS[0]
      : {
          ...profile,
          fullName: profile.fullName.trim() || currentUser?.fullName || 'Worker',
          email: profile.email.trim() || currentUser?.email || '',
          dob: profile.dob || currentUser?.dob || ''
        };
    const displayAge = computeAgeFromDob(displayCard.dob) || displayCard.age || 22;

    return (
      <div className="si-page">
        {globalStyles}
        {renderNavbar()}
        {renderAuthModal()}

        <div key="view-card" className="si-view-enter" style={{ flex: 1 }}>
          {!currentUser && !isUsingSampleCard && (
            <div className="si-auth-banner">
              <div className="si-auth-banner-inner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🔒</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#29223B' }}>
                    Guest preview only — sign up to save your card, chat history, and receive job offers from employers.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="si-outline-btn"
                    style={{ height: '38px' }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup-worker')}
                    className="si-pink-cta-btn"
                    style={{ height: '38px', padding: '0 22px' }}
                  >
                    Sign Up for Free
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="si-card-split">
            <div className="si-folder-wrap si-sec-yellow" style={{ position: 'sticky', top: '120px' }}>
              <div className="si-folder-tab">
                <span className="si-folder-badge">ID</span>
                <h2 className="si-folder-title">Digital Skill Card</h2>
              </div>

              <div className="si-folder-body" style={{ border: '1px solid #F3E29B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    {isUsingSampleCard && (
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#F496D7', color: '#FFFFFF', padding: '4px 9px', borderRadius: '6px', fontWeight: 700 }}>
                        Sample Digital Card
                      </span>
                    )}
                    {!currentUser && !isUsingSampleCard && (
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#6951C8', color: '#FFFFFF', padding: '4px 9px', borderRadius: '6px', fontWeight: 700 }}>
                        Unsaved Guest Card
                      </span>
                    )}
                    <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: !currentUser ? '8px' : '0px', color: '#29223B' }}>
                      {displayCard.fullName}
                    </h2>
                    {displayCard.email && (
                      <p style={{ fontSize: '13px', color: '#574192', marginTop: '4px', fontWeight: 500 }}>
                        ✉️ {displayCard.email}
                      </p>
                    )}
                    <p style={{ fontSize: '13px', color: '#525B6B', marginTop: '6px' }}>
                      📍 {displayCard.city || 'Quezon City'} • Age: {displayAge} • Min Pay: {displayCard.targetPay}
                    </p>
                  </div>

                  <button
                    onClick={() => navigateToView('setup')}
                    className="si-outline-btn"
                    style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
                  >
                    {isUsingSampleCard ? 'Create Card →' : '← Edit'}
                  </button>
                </div>

                <div style={{ marginTop: '18px', background: '#FFFFFF', color: '#29223B', padding: '18px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', border: '1px solid #ECEEF3' }}>
                  <div>
                    <strong style={{ color: '#574192', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Job Tracks
                    </strong>
                    <span>{displayCard.tracks.join(', ') || 'None selected'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#574192', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Skills
                    </strong>
                    <span>{displayCard.customSkills || 'None listed'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#574192', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Experience
                    </strong>
                    <span>{displayCard.workExperience || 'Entry-level / First-time jobseeker'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#574192', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Materials Ready
                    </strong>
                    <span>{displayCard.gear.join(', ') || 'None selected'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#574192', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Document Badges
                    </strong>
                    <span>{displayCard.badges.length > 0 ? displayCard.badges.join(' • ') : 'None marked yet'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="si-folder-wrap si-sec-aqua">
              <div className="si-folder-tab">
                <span className="si-folder-badge">AI</span>
                <h2 className="si-folder-title">Skill: Issued! Career Coach</h2>
              </div>

              <div className="si-folder-body" style={{ padding: '0', overflow: 'hidden', border: '1px solid #BCEEE9' }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #BCEEE9', background: '#DDFBF9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#115E59' }}>
                    {isUsingSampleCard
                      ? 'AI Career Coach locked on sample card'
                      : 'Tap a topic below or ask any question:'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#574192', background: '#FFFFFF', padding: '4px 10px', borderRadius: '6px' }}>
                    {isUsingSampleCard
                      ? 'Sample Mode'
                      : currentUser
                      ? 'Chat Saved to Account ✓'
                      : 'Guest Session (Not Saved)'}
                  </span>
                </div>

                {isUsingSampleCard && (
                  <div
                    style={{
                      padding: '28px 24px',
                      background: '#FFF7CC',
                      borderBottom: '1px solid #F3E29B',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div style={{ fontSize: '26px' }}>🔒</div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#29223B', maxWidth: '480px', lineHeight: '1.55' }}>
                      This profile is a sample. Create your skill card or log into your account to access the AI Career Coach feature.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => navigateToView('setup')}
                        className="si-pink-cta-btn"
                        style={{ height: '40px', padding: '0 22px' }}
                      >
                        Create Your Skill Card
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthModal('login')}
                        className="si-outline-btn"
                        style={{ height: '40px', padding: '0 20px' }}
                      >
                        Log Into Account
                      </button>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    opacity: isUsingSampleCard ? 0.45 : 1,
                    pointerEvents: isUsingSampleCard ? 'none' : 'auto',
                    userSelect: isUsingSampleCard ? 'none' : 'auto'
                  }}
                >
                  <div style={{ padding: '14px 22px', background: '#FFFFFF', borderBottom: '1px solid #ECEEF3', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {quickPrompts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={loading || isUsingSampleCard}
                        onClick={() => sendMessage(item.prompt)}
                        style={{
                          padding: '8px 14px',
                          background: '#FCE6FA',
                          border: '1px solid #F3C6EF',
                          color: '#574192',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: loading || isUsingSampleCard ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div
                    ref={aiChatContainerRef}
                    className="si-chat-feed"
                    style={{ padding: '22px', height: '50vh', overflowY: 'auto', background: '#FAFBFD', scrollBehavior: 'smooth' }}
                  >
                    {messages.map((m, idx) => {
                      const isUser = m.role === 'user';
                      return (
                        <div key={idx} className={`si-chat-row ${isUser ? 'right' : 'left'}`}>
                          <div className={`si-chat-bubble ${isUser ? 'outgoing' : 'incoming'}`}>
                            {isUser ? m.text : renderMessageWithLinks(m.text)}
                          </div>
                        </div>
                      );
                    })}
                    {loading && (
                      <div style={{ fontSize: '13px', color: '#687281', fontStyle: 'italic' }}>
                        Analyzing your Digital Skill Card...
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '16px 22px', borderTop: '1px solid #E3E7EC', background: '#FFFFFF', display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      disabled={isUsingSampleCard}
                      placeholder={
                        isUsingSampleCard
                          ? 'Create your skill card or sign in to chat...'
                          : 'Ask about matching jobs, skills, interview prep, or requirements...'
                      }
                      className="si-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || isUsingSampleCard}
                      className="si-pink-cta-btn"
                      style={{ height: '46px', padding: '0 26px' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  // =========================================================================
  // PART 3: JOB OFFERS TAB (SCOPED TO CURRENT LOGGED-IN USER)
  // =========================================================================
  // =========================================================================
  // PART 3: JOB OFFERS TAB (WITH RECIPIENT SIDEBAR FOR EMPLOYERS)
  // =========================================================================
  if (view === 'offers') {
    const isEmployerOffersView = currentUser?.role === 'employer';
    const displayedOffers =
      isEmployerOffersView && selectedOfferId !== 'ALL'
        ? jobOffers.filter((o) => o.id === selectedOfferId)
        : jobOffers;

    const renderOfferCard = (offer) => (
      <div key={offer.id} className="si-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #ECEEF3', paddingBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#CBF5EA', color: '#065F46', padding: '4px 10px', borderRadius: '6px' }}>
                VERIFIED EMPLOYER OFFER
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background:
                    offer.status === 'Accepted'
                      ? '#DCFCE7'
                      : offer.status === 'Declined'
                      ? '#FEE2E2'
                      : '#FFF7CC',
                  color:
                    offer.status === 'Accepted'
                      ? '#166534'
                      : offer.status === 'Declined'
                      ? '#991B1B'
                      : '#78350F'
                }}
              >
                {offer.status}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#29223B', marginTop: '10px' }}>
              {offer.jobTitle} — {offer.companyName}
            </h2>
            <p style={{ fontSize: '13px', color: '#687281', marginTop: '4px' }}>
              Candidate: <strong>{offer.workerName}</strong> {offer.workerEmail ? `(${offer.workerEmail})` : ''}
            </p>
          </div>

          {currentUser.role === 'worker' && offer.status === 'Pending Worker Response' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleOfferReplyOrStatus(offer.id, 'Accepted')}
                className="si-pink-cta-btn"
                style={{ height: '40px', padding: '0 22px' }}
              >
                Accept Offer ✓
              </button>
              <button
                type="button"
                onClick={() => handleOfferReplyOrStatus(offer.id, 'Declined')}
                className="si-outline-btn"
                style={{ height: '40px', padding: '0 18px', borderColor: '#FCA5A5', color: '#991B1B' }}
              >
                Decline
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            background: '#FFF7CC',
            padding: '18px',
            borderRadius: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              Who is scouting for workers
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#29223B', marginTop: '4px' }}>
              {offer.recruiterName}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              Who they work for
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#29223B', marginTop: '4px' }}>
              {offer.companyName}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              What job will they offer
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#29223B', marginTop: '4px' }}>
              {offer.jobTitle}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              Salary
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
              {offer.salary}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              Working Hours
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#29223B', marginTop: '4px' }}>
              {offer.workingHours}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B5997', textTransform: 'uppercase' }}>
              Employee Benefits
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#29223B', marginTop: '4px' }}>
              {offer.benefits || 'Not specified'}
            </div>
          </div>
        </div>

        {/* Offer Discussion & Messages Box */}
        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
              Offer Discussion & Messages
            </span>
            {currentUser?.role === 'employer' &&
              offer.messages?.length > 0 &&
              offer.messages[offer.messages.length - 1].senderRole === 'worker' && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#F1F3F6',
                    color: '#29223B',
                    border: '1px solid #E2E5EC',
                    padding: '3px 10px',
                    borderRadius: '6px'
                  }}
                >
                  💬 New reply from {offer.workerName}
                </span>
              )}
          </div>

          <div
            ref={(el) => {
              offerChatRefs.current[offer.id] = el;
            }}
            className="si-chat-feed"
            style={{
              background: '#FAFBFD',
              border: '1px solid #ECEEF3',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '14px',
              minHeight: '360px',
              maxHeight: '500px',
              overflowY: 'auto',
              scrollBehavior: 'smooth'
            }}
          >
            {(offer.messages || []).map((m, idx) => {
              const isMe = m.senderRole === currentUser?.role;
              return (
                <div key={idx} className={`si-chat-row ${isMe ? 'right' : 'left'}`}>
                  <div className={`si-chat-bubble ${isMe ? 'outgoing' : 'incoming'}`}>
                    {!isMe && (
                      <div className="si-chat-sender">
                        {m.senderName} ({m.senderRole === 'employer' ? 'Employer' : 'Applicant'})
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="si-input"
              style={{ height: '42px', fontSize: '13px' }}
              placeholder={
                currentUser?.role === 'employer'
                  ? `Reply to ${offer.workerName}'s questions about schedule, pay, or requirements...`
                  : 'Write a reply or question regarding this job offer...'
              }
              value={offerReplyInputs[offer.id] || ''}
              onChange={(e) =>
                setOfferReplyInputs((prev) => ({ ...prev, [offer.id]: e.target.value }))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleOfferReplyOrStatus(offer.id)}
            />
            <button
              type="button"
              onClick={() => handleOfferReplyOrStatus(offer.id)}
              className="si-neutral-reply-btn"
            >
              {currentUser?.role === 'employer' ? 'Send Reply' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="si-page">
        {globalStyles}
        {renderNavbar()}
        {renderAuthModal()}

        <div
          key="view-offers"
          className="si-view-enter"
          style={{
            width: '100%',
            maxWidth: '1376px',
            margin: '32px auto',
            padding: '0 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            flex: 1
          }}
        >
          <div className="si-folder-wrap si-sec-mint">
            <div className="si-folder-tab">
              <span className="si-folder-badge">★</span>
              <h1 className="si-folder-title">
                {isEmployerOffersView
                  ? `Sent Job Offers (${jobOffers.length})`
                  : `My Job Offers (${jobOffers.length})`}
              </h1>
            </div>
            <div className="si-folder-body">
              <p className="si-card-sub" style={{ marginBottom: 0 }}>
                {currentUser
                  ? 'Review official job offers addressed to your account, inspect full compensation and working hours, and reply directly.'
                  : 'Sign in to your worker or employer account to view your private job offers.'}
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="si-card" style={{ textAlign: 'center', padding: '56px 28px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#29223B' }}>Sign in to view your Job Offers</h3>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#697381', maxWidth: '520px', margin: '8px auto 20px' }}>
                Worker Information are private to the individual worker and employer accounts. Sign in or create an account to receive offers from verified companies.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => openAuthModal('login')} className="si-pink-cta-btn">
                  Sign In
                </button>
                <button type="button" onClick={() => openAuthModal('signup-worker')} className="si-outline-btn">
                  Create Worker Account
                </button>
              </div>
            </div>
          ) : jobOffers.length === 0 ? (
            <div className="si-card" style={{ textAlign: 'center', padding: '56px 28px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#29223B' }}>No job offers yet</h3>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#697381', maxWidth: '520px', margin: '8px auto 20px' }}>
                {isEmployerOffersView
                  ? 'You have not sent any job offers yet. Browse candidates in the Employer Portal to send an official offer.'
                  : 'When a verified employer scouts your Digital Skill Card and sends an offer to your account, all role details, salary, working hours, and benefits will appear here.'}
              </p>
              {isEmployerOffersView && (
                <button type="button" onClick={() => navigateToView('employer')} className="si-pink-cta-btn">
                  Browse Candidates in Employer View
                </button>
              )}
            </div>
          ) : isEmployerOffersView ? (
            <div className="si-main" style={{ margin: 0, padding: 0 }}>
              {/* Left Sidebar Listing All Users Sent Job Offers */}
              <aside className="si-sidebar">
                <div className="si-guide-card" style={{ padding: '20px 16px' }}>
                  <div className="si-guide-header">
                    <div className="si-guide-title">Candidates Offered</div>
                    <div className="si-guide-sub">
                      {jobOffers.length} {jobOffers.length === 1 ? 'offer sent' : 'offers sent'}
                    </div>
                  </div>

                  <div className="si-step-list" style={{ marginTop: '16px', maxHeight: '62vh', overflowY: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedOfferId('ALL')}
                      className={`si-step-btn ${selectedOfferId === 'ALL' ? 'active' : ''}`}
                    >
                      <span className="si-step-num">All</span>
                      <div>
                        <div className="si-step-title">All Sent Offers</div>
                        <div className="si-step-desc">Show all {jobOffers.length} candidates</div>
                      </div>
                    </button>

                    {jobOffers.map((offer, idx) => {
                      const isSelected = selectedOfferId === offer.id;
                      const hasNewReply =
                        offer.messages?.length > 0 &&
                        offer.messages[offer.messages.length - 1].senderRole === 'worker';

                      return (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => setSelectedOfferId(offer.id)}
                          className={`si-step-btn ${isSelected ? 'active' : ''}`}
                          style={{ height: 'auto', minHeight: '62px', padding: '10px 12px' }}
                        >
                          <span className="si-step-num">{idx + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="si-step-title"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {offer.workerName}
                              </span>
                              {hasNewReply && (
                                <span
                                  title="New worker reply"
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#6951C8',
                                    flexShrink: 0
                                  }}
                                />
                              )}
                            </div>
                            <div
                              className="si-step-desc"
                              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {offer.jobTitle} • {offer.status}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* Right Column: Selected Candidate's Offer(s) */}
              <div className="si-cards">
                {(displayedOffers.length > 0 ? displayedOffers : jobOffers).map((offer) =>
                  renderOfferCard(offer)
                )}
              </div>
            </div>
          ) : (
            jobOffers.map((offer) => renderOfferCard(offer))
          )}
        </div>
        {renderFooter()}
      </div>
    );
  }

  // =========================================================================
  // PART 4: CAREER RESOURCES TAB
  // =========================================================================
  if (view === 'resources') {
    const getCategoryStyle = (categoryName) => {
      return (
        COURSE_CATEGORIES.find((c) => c.name === categoryName) || {
          name: categoryName,
          bg: '#FCE6FA',
          color: '#574192',
          border: '#6951C8'
        }
      );
    };

    const filteredCourses = coursesList.filter((c) => {
      const categoryName = (c.Category || 'Finance and Corporate Services').trim();
      return courseFilter === 'All' || categoryName === courseFilter;
    });

    const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, 6);

    return (
      <div className="si-page">
        {globalStyles}
        {renderNavbar()}
        {renderAuthModal()}

        <div key="view-resources" className="si-view-enter" style={{ width: '100%', maxWidth: '1376px', margin: '32px auto', padding: '0 32px', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
          <section className="si-folder-wrap si-sec-pink">
            <div className="si-folder-tab">
              <span className="si-folder-badge">01</span>
              <h2 className="si-folder-title">Free Upskilling Courses Directory</h2>
            </div>

            <div className="si-folder-body">
              <p className="si-card-sub">
                Browse 100 online skill courses to expand your resume.
              </p>
              <div className="si-chip-wrap">
                {COURSE_CATEGORIES.map((cat) => {
                  const isSelected = courseFilter === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setCourseFilter(cat.name);
                        setShowAllCourses(false);
                      }}
                      style={{
                        height: '38px',
                        padding: '0 16px',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: isSelected ? cat.bg : '#FFFFFF',
                        color: isSelected ? cat.color : '#4B5563',
                        border: isSelected ? `1.5px solid ${cat.border}` : '1px solid #E2E5EC',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {cat.name !== 'All' && (
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: cat.border }} />
                      )}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: '22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
                {visibleCourses.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '24px', background: '#FFFFFF', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: '#687281' }}>
                    No courses available in this category yet.
                  </div>
                ) : (
                  visibleCourses.map((course, idx) => {
                    const catStyle = getCategoryStyle(course.Category);
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid #E3E7EC',
                          borderTop: `4px solid ${catStyle.border}`,
                          borderRadius: '12px',
                          padding: '20px',
                          background: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: catStyle.bg,
                                color: catStyle.color,
                                padding: '4px 9px',
                                borderRadius: '6px'
                              }}
                            >
                              {course.Category}
                            </span>
                            {course.Target_Job && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#F1F2F6',
                                  color: '#4B5563',
                                  padding: '4px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                {course.Target_Job}
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#29223B', marginTop: '12px', lineHeight: '1.4' }}>
                            {course.Course_Title}
                          </h3>
                          <p style={{ fontSize: '13px', color: '#5E5374', marginTop: '8px', lineHeight: '1.5' }}>
                            <strong style={{ color: '#374151' }}>Skill gained:</strong> {course.Skill}
                          </p>
                        </div>

                        <a
                          href={course.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '10px 14px',
                            background: '#F496D7',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          Start Free Course ↗
                        </a>
                      </div>
                    );
                  })
                )}
              </div>

              {filteredCourses.length > 6 && (
                <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowAllCourses((prev) => !prev)}
                    className="si-outline-btn"
                  >
                    {showAllCourses
                      ? 'Show Fewer Courses ↑'
                      : `Show All ${filteredCourses.length} Courses (${filteredCourses.length - 6} more) ↓`}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="si-folder-wrap si-sec-mint">
            <div className="si-folder-tab">
              <span className="si-folder-badge">02</span>
              <h2 className="si-folder-title">How to Get Documents for Work </h2>
            </div>

            <div className="si-folder-body">
              <p className="si-card-sub">
                Under the <strong>First-Time Jobseekers Assistance Act (RA 11261)</strong>, government clearance fees are waived if you present a Barangay Certification.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {DOCUMENT_GUIDES.map((doc) => (
                  <div
                    key={doc.title}
                    style={{ border: '1px solid #E2E5EC', background: '#FFFFFF', borderRadius: '12px', padding: '18px' }}
                  >
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#443579' }}>✓ {doc.title}</div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                      <div>{doc.information}</div>
                      <div><strong>Where:</strong> {doc.where}</div>
                      <div><strong>Processing Time:</strong> {doc.time}</div>
                      <div><strong>What to Bring:</strong> {doc.bring}</div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '11px', background: '#FFF7CC', color: '#5C4A1E', padding: '8px 10px', borderRadius: '7px', fontWeight: 500 }}>
                      {doc.feeNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <section className="si-folder-wrap si-sec-aqua">
              <div className="si-folder-tab">
                <span className="si-folder-badge">03</span>
                <h2 className="si-folder-title">Interview & Shift Pocket Guides</h2>
              </div>
              <div className="si-folder-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {INTERVIEW_GUIDES.map((guide, idx) => {
                    const isOpen = openGuideIdx === idx;
                    return (
                      <div key={idx} style={{ border: '1px solid #E3E7EC', borderRadius: '10px', overflow: 'hidden', background: '#FFFFFF' }}>
                        <button
                          type="button"
                          onClick={() => setOpenGuideIdx(isOpen ? -1 : idx)}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: isOpen ? '#F3EFFB' : '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6951C8', textTransform: 'uppercase' }}>
                              {guide.tag}
                            </span>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#29223B', marginTop: '2px' }}>
                              {guide.title}
                            </div>
                          </div>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#6951C8' }}>
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '14px 16px', background: '#FAFBFD', fontSize: '14px', lineHeight: '1.65', color: '#374151', whiteSpace: 'pre-line', borderTop: '1px solid #ECEEF3' }}>
                            {guide.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="si-folder-wrap si-sec-yellow">
              <div className="si-folder-tab">
                <span className="si-folder-badge">04</span>
                <h2 className="si-folder-title"> Wage & Shift Rights</h2>
              </div>
              <div className="si-folder-body">
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '15px', lineHeight: '1.6', color: '#29223B' }}>
                  <div>
                    <strong>Minimum Day-Rate Protection:</strong>
                    <p style={{ marginTop: '4px' }}>
                      In Metro Manila (NCR), standard daily minimum wage starts at <strong>₱645+</strong> (non-agriculture) for an 8-hour shift, plus a mandatory 1-hour meal break.
                    </p>
                  </div>
                  <div>
                    <strong>Overtime & Night Differential:</strong>
                    <p style={{ marginTop: '4px' }}>
                      Work beyond 8 hours earns at least <strong>+25% hourly overtime pay</strong>. Shifts between 10:00 PM and 6:00 AM earn an extra <strong>+10% night differential</strong>.
                    </p>
                  </div>
                  <div>
                    <strong>Zero Placement Fees:</strong>
                    <p style={{ marginTop: '4px' }}>
                      Legitimate employers on <em>Skill: Issued!</em> will <strong>never</strong> ask you to pay a registration, uniform deposit, or processing fee just to apply.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToView(isVerifiedEmployer ? 'employer' : 'card')}
                  className="si-pink-cta-btn"
                  style={{ width: '100%', marginTop: '22px' }}
                >
                  {isVerifiedEmployer
                    ? 'Back to Search for Workers →'
                    : 'Ask AI Coach About My Career Path →'}
                </button>
              </div>
            </section>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  // =========================================================================
  // PART 5: EMPLOYER VIEW — VERIFIED COMPANY PORTAL & STRUCTURED OFFERS
  // =========================================================================
  if (!isVerifiedEmployer) {
    return (
      <div className="si-page">
        {globalStyles}
        {renderNavbar()}
        {renderAuthModal()}

        <div
          key="view-employer-locked"
          className="si-view-enter"
          style={{
            width: '100%',
            maxWidth: '720px',
            margin: '56px auto',
            padding: '0 24px',
            flex: 1
          }}
        >
          <div className="si-folder-wrap si-sec-pink">
            <div className="si-folder-tab">
              <span className="si-folder-badge">🔒</span>
              <h1 className="si-folder-title">Employer Portal Access Restricted</h1>
            </div>

            <div className="si-folder-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#29223B' }}>
                Verified Employer Account Required
              </h2>
              <p
                style={{
                  marginTop: '12px',
                  fontSize: '14px',
                  lineHeight: '1.65',
                  color: '#525B6B',
                  maxWidth: '520px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                To protect worker privacy, Digital Skill Cards, contact information, and applicant details are strictly hidden from guest and worker accounts. Only verified employers can browse worker profiles and send job offers.
              </p>

              {currentUser?.role === 'worker' && (
                <div
                  style={{
                    marginTop: '18px',
                    padding: '12px 16px',
                    background: '#FFF7CC',
                    border: '1px solid #F3E29B',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#5C4A1E',
                    fontWeight: 500
                  }}
                >
                  You are currently signed in as a <strong>Worker ({currentUser.fullName})</strong>. Log out and sign in with a verified employer account to access the talent directory.
                </div>
              )}

              <div
                style={{
                  marginTop: '26px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="si-pink-cta-btn"
                >
                  Sign In as Verified Employer
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('request-employer')}
                  className="si-outline-btn"
                >
                  Request Company Verification
                </button>
              </div>
            </div>
          </div>
        </div>

        {renderFooter()}
      </div>
    );
  }

  return (
    <div className="si-page">
      {globalStyles}
      {renderNavbar()}
      {renderAuthModal()}

      <main key="view-employer" className="si-main si-view-enter">
        <aside className="si-sidebar">
          <div className="si-guide-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="si-guide-title">Filter Workers</div>
              <button
                type="button"
                onClick={() => {
                  setEmpSearch('');
                  setEmpCity('');
                  setEmpTrack('All');
                  setEmpAgeBracket('All');
                  setEmpRequiredBadges([]);
                }}
                style={{ background: 'none', border: 'none', color: '#6951C8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
            <div className="si-guide-sub">{filteredWorkers.length} shift-ready candidates found</div>

            <div style={{ marginTop: '20px' }}>
              <label className="si-label">Skill or keyword</label>
              <input
                type="text"
                className="si-input"
                style={{ height: '42px', fontSize: '13px' }}
                placeholder="e.g. Service crew, POS, rider"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="si-label">City / Barangay</label>
              <input
                type="text"
                className="si-input"
                style={{ height: '42px', fontSize: '13px' }}
                placeholder="e.g. Quezon City, Pasig"
                value={empCity}
                onChange={(e) => setEmpCity(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="si-label">Age bracket (18+)</label>
              <select
                className="si-input"
                style={{ height: '42px', fontSize: '13px', cursor: 'pointer' }}
                value={empAgeBracket}
                onChange={(e) => setEmpAgeBracket(e.target.value)}
              >
                <option value="All">All Ages (18+)</option>
                <option value="18-24">18 – 24 years old</option>
                <option value="25-34">25 – 34 years old</option>
                <option value="35-44">35 – 44 years old</option>
                <option value="45+">45+ years old</option>
              </select>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="si-label">Job track</label>
              <select
                className="si-input"
                style={{ height: '42px', fontSize: '13px', cursor: 'pointer' }}
                value={empTrack}
                onChange={(e) => setEmpTrack(e.target.value)}
              >
                <option value="All">All Job Tracks</option>
                <option value="Food Service">Food Service</option>
                <option value="Warehouse and Logistics">Warehouse and Logistics</option>
                <option value="Retail and Promo">Retail and Promo</option>
                <option value="Digital and Technology">Digital and Technology</option>
                <option value="Education">Education</option>
                <option value="Creative and Media">Creative and Media</option>
                <option value="Office & admin">Office & admin</option>
              </select>
            </div>

            <div style={{ marginTop: '18px' }}>
              <label className="si-label">Must have documents</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Barangay Clearance',
                  'Health Certificate',
                  'NBI Clearance',
                  'SSS / PhilHealth / Pag-IBIG'
                ].map((badge) => {
                  const active = empRequiredBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => toggleEmpBadge(badge)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: active ? '1px solid #6951C8' : '1px solid #DDE0E8',
                        background: active ? '#F3EFFB' : '#FFFFFF',
                        color: active ? '#574192' : '#4B3D65',
                        fontSize: '12px',
                        fontWeight: 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span>{badge}</span>
                      <span>{active ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="si-cards">
          {filteredWorkers.length === 0 ? (
            <div className="si-card" style={{ textAlign: 'center', padding: '48px 28px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#29223B' }}>No matching workers found</h3>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#697381' }}>
                Try adjusting the age bracket, required document filters, or clearing your city search.
              </p>
            </div>
          ) : (
            filteredWorkers.map((worker) => {
              const workerOffers = jobOffers.filter((o) => o.workerId === worker.id);
              const canReceiveOffer = Boolean(worker.userId) || Boolean(worker.isSample);
              return (
                <div key={worker.id} className="si-card" style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#29223B' }}>{worker.fullName}</h3>
                        {worker.isSample && (
                          <span style={{ fontSize: '10px', fontWeight: 700, background: '#FFF7CC', color: '#78350F', border: '1px solid #F3E29B', padding: '3px 8px', borderRadius: '6px' }}>
                            SAMPLE DIGITAL CARD
                          </span>
                        )}
                        {workerOffers.length > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 700, background: '#CBF5EA', color: '#065F46', padding: '3px 8px', borderRadius: '6px' }}>
                            {workerOffers.length} OFFER(S) SENT ✓
                          </span>
                        )}
                      </div>
                      {worker.email && (
                        <p style={{ marginTop: '3px', fontSize: '12px', color: '#574192', fontWeight: 500 }}>
                          ✉️ {worker.email}
                        </p>
                      )}
                      <p style={{ marginTop: '4px', fontSize: '13px', color: '#697381' }}>
                        📍 {worker.city} • Age {worker.age} • Min Rate:{' '}
                        <strong style={{ color: '#29223B' }}>{worker.targetPay}/day</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canReceiveOffer}
                      onClick={() => {
                        setOfferFeedback('');
                        setSelectedWorker(worker);
                      }}
                      className="si-pink-cta-btn"
                      style={{ height: '40px', padding: '0 22px' }}
                    >
                      {canReceiveOffer ? 'Send Job Offer' : 'Unregistered Account'}
                    </button>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {worker.tracks.map((t) => (
                      <span
                        key={t}
                        style={{ fontSize: '11px', fontWeight: 600, background: '#FCE6FA', color: '#574192', padding: '5px 12px', borderRadius: '6px' }}
                      >
                        {t}
                      </span>
                    ))}
                    {worker.gear.map((g) => (
                      <span
                        key={g}
                        style={{ fontSize: '11px', fontWeight: 500, background: '#FAFBFD', border: '1px solid #E3E7EC', color: '#647080', padding: '4px 10px', borderRadius: '6px' }}
                      >
                        Has: {g}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: '16px', padding: '14px 16px', background: '#DDFBF9', borderRadius: '10px', fontSize: '13px', lineHeight: '1.6' }}>
                    <div>
                      <strong style={{ color: '#115E59' }}>Skills:</strong>{' '}
                      <span style={{ color: '#29223B' }}>{worker.customSkills}</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <strong style={{ color: '#115E59' }}>Experience:</strong>{' '}
                      <span style={{ color: '#29223B' }}>{worker.workExperience}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#687281', marginRight: '4px' }}>
                      Documents on hand:
                    </span>
                    {worker.badges.length > 0 ? (
                      worker.badges.map((b) => (
                        <span
                          key={b}
                          style={{ fontSize: '11px', fontWeight: 600, background: '#CBF5EA', color: '#065F46', padding: '4px 10px', borderRadius: '6px' }}
                        >
                          ✓ {b}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: '#737B89' }}>None marked yet</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* STRUCTURED JOB OFFER MODAL */}
      {selectedWorker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(41, 34, 59, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 60
          }}
        >
          <div
            className="si-modal-enter"
            style={{
              width: '100%',
              maxWidth: '580px',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E3E7EC',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(41, 34, 59, 0.2)'
            }}
          >
            <div style={{ background: '#FCE6FA', color: '#29223B', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3D1F0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#7A659E', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Official Employer & Job Offer Package
                </div>
                <div className="si-display-font" style={{ fontSize: '20px', fontWeight: 800, color: '#F294D0', marginTop: '2px' }}>
                  Candidate: {selectedWorker.fullName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                style={{ background: '#FFFFFF', border: '1px solid #E2E5EC', color: '#4B5563', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '22px 24px', maxHeight: '78vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {offerFeedback && (
                <div
                  style={{
                    padding: '11px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: offerFeedback.includes('sent!') ? '#ECFDF5' : '#FEF2F2',
                    color: offerFeedback.includes('sent!') ? '#065F46' : '#991B1B',
                    border: offerFeedback.includes('sent!') ? '1px solid #A7F3D0' : '1px solid #FECACA'
                  }}
                >
                  {offerFeedback}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="si-label">Who is scouting for workers</label>
                  <input
                    type="text"
                    className="si-input"
                    style={{ height: '42px', fontSize: '13px' }}
                    value={offerForm.recruiterName}
                    onChange={(e) => setOfferForm({ ...offerForm, recruiterName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Who they work for (Company)</label>
                  <input
                    type="text"
                    className="si-input"
                    style={{ height: '42px', fontSize: '13px' }}
                    value={offerForm.companyName}
                    onChange={(e) => setOfferForm({ ...offerForm, companyName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="si-label">What job will they offer</label>
                  <input
                    type="text"
                    className="si-input"
                    style={{ height: '42px', fontSize: '13px' }}
                    value={offerForm.jobTitle}
                    onChange={(e) => setOfferForm({ ...offerForm, jobTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="si-label">Salary / Day-Rate</label>
                  <input
                    type="text"
                    className="si-input"
                    style={{ height: '42px', fontSize: '13px' }}
                    value={offerForm.salary}
                    onChange={(e) => setOfferForm({ ...offerForm, salary: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="si-label">Working Hours & Shift Schedule</label>
                <input
                  type="text"
                  className="si-input"
                  style={{ height: '42px', fontSize: '13px' }}
                  value={offerForm.workingHours}
                  onChange={(e) => setOfferForm({ ...offerForm, workingHours: e.target.value })}
                />
              </div>

              <div>
                <label className="si-label">Employee Benefits (if applicable)</label>
                <input
                  type="text"
                  className="si-input"
                  style={{ height: '42px', fontSize: '13px' }}
                  placeholder="e.g. Free crew meal, HMO, overtime pay, uniform provided"
                  value={offerForm.benefits}
                  onChange={(e) => setOfferForm({ ...offerForm, benefits: e.target.value })}
                />
              </div>

              <div>
                <label className="si-label">Personal Message to Worker</label>
                <textarea
                  className="si-textarea-lg"
                  style={{ height: '68px', padding: '12px' }}
                  value={offerForm.note}
                  onChange={(e) => setOfferForm({ ...offerForm, note: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleSendStructuredOffer}
                  className="si-pink-cta-btn"
                  style={{ flex: 1 }}
                >
                  Send Official Job Offer
                </button>
                {offerFeedback.includes('sent!') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorker(null);
                      navigateToView('offers');
                    }}
                    className="si-outline-btn"
                    style={{ height: '44px' }}
                  >
                    View Sent Offers →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderFooter()}
    </div>
  );
}