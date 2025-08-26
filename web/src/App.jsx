import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { marked } from "marked";
import Dashboard from "./Dashboard.jsx";
import Campaigns from "./Campaigns.jsx";
import PublicSurvey from "./PublicSurvey.jsx";
import Debug from "./Debug.jsx";

const API = "http://localhost:8787";
const qc = new QueryClient();

async function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, { credentials: "include", ...options });
}

// Navigation header component
function AppHeader({ user }) {
  const navigate = useNavigate();
  
  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 cursor-pointer" onClick={() => navigate('/')}>
              AI Survey Platform
            </h1>
          </div>
          
          <nav className="flex items-center space-x-4">
            {(user.role === 'reviewer' || user.role === 'admin') && (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => navigate('/campaigns')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Campaigns
                </button>
              </>
            )}
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {user.email} ({user.role})
                {user.orgSlug && ` @ ${user.orgSlug}`}
              </span>
              <a 
                href={`${API}/auth/logout`}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </a>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

// Login page
function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            AI Survey Platform
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your surveys and campaigns
          </p>
        </div>
        <div className="text-center">
          <a 
            href={`${API}/auth/login`}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🔐 Login with Auth0
          </a>
          <p className="mt-3 text-xs text-gray-500">
            You'll be redirected to Auth0 for secure authentication
          </p>
        </div>
      </div>
    </div>
  );
}

// Legacy survey interface (for backward compatibility)
function LegacySurvey() {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [brief, setBrief] = useState("");
  const navigate = useNavigate();

  async function startSession() {
    const r = await apiFetch("/api/sessions", { method: "POST" });
    const d = await r.json();
    setSessionId(d.sessionId);
    setQuestion(d.question);
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    const r = await apiFetch(`/api/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, text: answer })
    });
    const d = await r.json();
    setAnswer("");
    if (d.completed) { 
      setCompleted(true); 
      setQuestion(null); 
    } else {
      setQuestion(d.next);
    }
  }

  async function submitSurvey() {
    const r = await apiFetch(`/api/sessions/${sessionId}/submit`, { method: "POST" });
    const d = await r.json();
    setBrief(d.briefMarkdown || "");
  }

  const downloadBrief = () => {
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-brief-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Survey</h2>
        <p className="text-gray-600">Create a survey using the classic interface</p>
      </div>

      {!sessionId ? (
        <div className="text-center py-12">
          <button 
            onClick={startSession}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg"
          >
            Start New Survey
          </button>
          <p className="mt-4 text-sm text-gray-600">
            Or <button onClick={() => navigate('/campaigns')} className="text-blue-600 hover:underline">create a campaign</button> for more advanced features
          </p>
        </div>
      ) : (
        <>
          {!completed && question && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">{question.text}</h3>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={5}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your answer..."
              />
              <div className="flex justify-between mt-4">
                <button 
                  onClick={() => { setCompleted(true); setQuestion(null); }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Finish Now
                </button>
                <button 
                  onClick={submitAnswer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Next Question
                </button>
              </div>
            </div>
          )}

          {completed && !brief && (
            <div className="text-center py-12">
              <button 
                onClick={submitSurvey}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg"
              >
                Generate Project Brief
              </button>
            </div>
          )}

          {brief && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Generated Brief</h3>
                <button 
                  onClick={downloadBrief}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Download .md
                </button>
              </div>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: marked.parse(brief) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Main app with authentication and routing
function MainApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      console.log('🔍 Fetching user info...');
      const r = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (r.ok) {
        const userData = await r.json();
        console.log('✅ User data received:', userData);
        setUser(userData.user);
      } else {
        console.log('❌ Failed to fetch user data, status:', r.status);
        setUser(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <AppHeader user={user} />
        
        <Routes>
          {/* Public routes */}
          <Route path="/reply/:token" element={<PublicSurvey />} />
          
          {/* Protected routes */}
          {user ? (
            <>
              <Route path="/" element={<LegacySurvey />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/campaigns" element={
                user.role === 'reviewer' || user.role === 'admin' ? 
                <Campaigns /> : 
                <Navigate to="/" replace />
              } />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<LoginPage />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <MainApp />
    </QueryClientProvider>
  );
}