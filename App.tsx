
import React, { useState, useEffect } from 'react';
import { ChangelogInput, GeneratedChangelog, ReleaseCategory, User, TemplateType, Repository, PricingPlan, AppView } from './types';
import { generateChangelogAI } from './services/geminiService';

const TEMPLATES: { id: TemplateType; name: string; icon: string; desc: string }[] = [
  { id: 'standard', name: 'Standard', icon: '📝', desc: 'Balanced & professional' },
  { id: 'marketing', name: 'SaaS Update', icon: '🚀', desc: 'Benefit-focused & punchy' },
  { id: 'technical', name: 'Technical', icon: '🛠️', desc: 'Detailed & precise' },
  { id: 'minimal', name: 'Minimal', icon: '📄', desc: 'Short & sweet' }
];

const PRICING_PLANS: PricingPlan[] = [
  { id: 'starter', name: 'Starter', price: '$0', features: ['5 Changelogs / mo', 'Standard Template', 'Manual Input only', 'Markdown Export'] },
  { id: 'pro', name: 'Pro', price: '$12', features: ['Unlimited Changelogs', 'All 4 Templates', 'GitHub Integration', 'HTML & Plain Text Export', 'Custom Branding'], recommended: true },
  { id: 'enterprise', name: 'Business', price: '$49', features: ['Team Workspaces', 'API Access', 'Automated Webhooks', 'Dedicated Support', 'Whitelabeling'] }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedChangelog | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'plainText'>('markdown');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<string | null>(null);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);

  const [form, setForm] = useState<ChangelogInput>({
    version: '1.0.0',
    date: new Date().toISOString().split('T')[0],
    template: 'standard',
    entries: [
      { category: 'features', content: '' },
      { category: 'fixes', content: '' },
      { category: 'improvements', content: '' }
    ]
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('logspark_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    window.scrollTo(0, 0);
  }, [view]);

  // Simulated "Original" GitHub Login with Username Fetching
  const handleGitHubSignIn = () => {
    setIsAuthLoading('github');
    const width = 500, height = 650;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    // We open a real window to simulate the OAuth popup
    const popup = window.open('', 'GitHub Sign In', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Sign in to GitHub</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-[#f6f8fa] flex flex-col items-center justify-center min-h-screen font-sans p-6">
            <div class="w-full max-w-[340px] text-center">
              <svg class="mx-auto mb-6" height="48" viewBox="0 0 16 16" width="48"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
              <div class="bg-white border border-[#d8dee4] rounded-md p-6 text-left shadow-sm">
                <h1 class="text-2xl font-light mb-6">Sign in to GitHub</h1>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-semibold mb-2">Username or email address</label>
                    <input id="gh-user" type="text" class="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 outline-none transition" placeholder="Enter your GitHub username">
                    <p class="text-[10px] text-gray-500 mt-1">Enter a real username to fetch your actual repos.</p>
                  </div>
                  <button id="auth-btn" class="w-full bg-[#2da44e] text-white font-semibold py-2 rounded-md hover:bg-[#2c974b] transition text-sm">Sign in</button>
                </div>
              </div>
            </div>
            <script>
              document.getElementById('auth-btn').onclick = () => {
                const user = document.getElementById('gh-user').value || 'octocat';
                window.opener.postMessage({ type: 'GITHUB_AUTH', username: user }, window.location.origin);
              }
            </script>
          </body>
        </html>
      `);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'GITHUB_AUTH') {
          const username = event.data.username;
          const mockUser: User = {
            id: `gh_${Date.now()}`,
            name: username.charAt(0).toUpperCase() + username.slice(1),
            username: username,
            avatarUrl: `https://github.com/${username}.png`,
            provider: 'github'
          };
          setUser(mockUser);
          localStorage.setItem('logspark_user', JSON.stringify(mockUser));
          setIsAuthLoading(null);
          setView('generator');
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    }
  };

  const handleGoogleSignIn = () => {
    setIsAuthLoading('google');
    const width = 500, height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const popup = window.open('', 'Google Sign In', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Sign in - Google Accounts</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-white flex items-center justify-center h-screen font-sans">
            <div class="w-[450px] border border-gray-200 rounded-lg p-10 shadow-sm text-center">
              <svg class="mx-auto mb-4" width="75" height="24" viewBox="0 0 75 24"><path fill="#4285F4" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.055 0 11.731-4.957 11.731-11.94 0-.803-.086-1.416-.189-2.255h-11.542z"/></svg>
              <h1 class="text-2xl font-medium mb-2">Sign in</h1>
              <p class="text-sm mb-8 text-gray-600">to continue to LogSpark</p>
              <div id="google-accounts" class="space-y-4 text-left">
                <div class="border-b border-gray-100 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition rounded-md px-2" onclick="select('Alex Rivera', 'alex.rivera@gmail.com')">
                  <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">AR</div>
                  <div>
                    <p class="text-sm font-medium">Alex Rivera</p>
                    <p class="text-xs text-gray-500">alex.rivera@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
            <script>
              function select(name, email) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH', name, email }, window.location.origin);
              }
            </script>
          </body>
        </html>
      `);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_AUTH') {
          const mockUser: User = {
            id: `goog_${Date.now()}`,
            name: event.data.name,
            username: event.data.email,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.data.name}`,
            provider: 'google'
          };
          setUser(mockUser);
          localStorage.setItem('logspark_user', JSON.stringify(mockUser));
          setIsAuthLoading(null);
          setView('generator');
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('logspark_user');
    setResult(null);
    setRepositories([]);
    setView('home');
  };

  const fetchRealRepositories = async () => {
    if (!user || user.provider !== 'github') return;
    setFetchingRepos(true);
    try {
      // Use GitHub Public API to fetch real data
      const response = await fetch(`https://api.github.com/users/${user.username}/repos?sort=updated&per_page=100`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setRepositories(data.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          stargazers_count: repo.stargazers_count
        })));
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    } finally {
      setFetchingRepos(false);
    }
  };

  useEffect(() => {
    if (showRepoModal && user) fetchRealRepositories();
  }, [showRepoModal, user]);

  const handleEntryChange = (index: number, content: string) => {
    const newEntries = [...form.entries];
    newEntries[index] = { ...newEntries[index], content };
    setForm({ ...form, entries: newEntries });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.entries.every(e => !e.content.trim())) {
      setError("Please add at least one change entry.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await generateChangelogAI(form);
      setResult(data);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(`AI generation failed. Technical Error: ${err?.message || "Check Browser Console"}. If hosted on Vercel, ensure API_KEY is set and the project is redeployed.`);
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  const renderNav = () => (
    <header className="bg-white/90 backdrop-blur-xl border-b sticky top-0 z-40 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">L</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">LogSpark</h1>
        </div>
        
        <nav className="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
          <button onClick={() => setView('home')} className={`hover:text-black transition ${view === 'home' ? 'text-black font-bold' : ''}`}>Home</button>
          <button onClick={() => setView('generator')} className={`hover:text-black transition ${view === 'generator' ? 'text-black font-bold' : ''}`}>Generator</button>
          <button onClick={() => setView('pricing')} className={`hover:text-black transition ${view === 'pricing' ? 'text-black font-bold' : ''}`}>Pricing</button>
          <button onClick={() => setView('about')} className={`hover:text-black transition ${view === 'about' ? 'text-black font-bold' : ''}`}>About</button>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900">{user.name}</p>
                <button onClick={handleSignOut} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase transition">Sign Out</button>
              </div>
              <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full border border-gray-100 shadow-sm" />
            </div>
          ) : (
            <button 
              onClick={() => setView('generator')}
              className="bg-black text-white px-5 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-32 py-20 px-4">
      <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h2 className="text-6xl md:text-8xl font-extrabold text-gray-900 tracking-tight leading-[0.95]">
          Ship Updates <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">Faster with AI.</span>
        </h2>
        <p className="text-gray-500 text-xl md:text-2xl max-w-3xl mx-auto font-medium">
          The only tool that turns your messy git commits into professional, benefit-driven release notes in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => setView('generator')}
            className="w-full sm:w-auto bg-black text-white px-10 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            Try the Generator
          </button>
          <button 
            onClick={() => setView('pricing')}
            className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all shadow-md"
          >
            View Pricing
          </button>
        </div>
        <div className="pt-20 max-w-5xl mx-auto opacity-40">
          <div className="p-4 bg-gray-100 rounded-[2.5rem] border border-gray-200">
            <div className="h-[400px] bg-white rounded-[2rem] border shadow-2xl flex items-center justify-center">
              <span className="text-gray-300 font-bold uppercase tracking-widest">Interactive Dashboard Preview</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {[
          { icon: '🤖', title: 'Gemini AI', desc: 'Powerful 3-series models summarize complex code changes into user-friendly updates.' },
          { icon: '🔗', title: 'GitHub Sync', desc: 'Auth directly and fetch your real repository data to generate notes instantly.' },
          { icon: '📄', title: 'Export Ready', desc: 'Markdown, HTML, and Plain Text outputs ready to paste into your blog or email.' }
        ].map(f => (
          <div key={f.title} className="p-10 rounded-[2rem] border-2 border-gray-50 hover:border-black transition-all group bg-white shadow-xl shadow-gray-100">
            <div className="text-4xl mb-6">{f.icon}</div>
            <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const renderLegal = (title: string, body: React.ReactNode) => (
    <div className="max-w-4xl mx-auto py-20 px-4 animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[2.5rem] border shadow-2xl shadow-gray-100 prose prose-gray max-w-none">
        <h2 className="text-5xl font-black mb-8 tracking-tighter">{title}</h2>
        <div className="text-gray-600 font-medium leading-relaxed space-y-6">
          {body}
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {!user && (
        <div className="p-12 rounded-[3rem] bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Connect Your Account</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">To fetch real repository data and sync your changes, please sign in with one of our providers.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleGitHubSignIn}
                className="w-full sm:w-auto bg-[#24292e] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
                Sign in with GitHub
              </button>
              <button 
                onClick={handleGoogleSignIn}
                className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 border border-gray-100 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/></svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Configure Release</h2>
              {user && user.provider === 'github' && (
                <button 
                  onClick={() => setShowRepoModal(true)}
                  className="text-xs font-bold text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl hover:bg-blue-100 transition-colors uppercase tracking-widest"
                >
                  Import From GitHub
                </button>
              )}
            </div>

            <div className="mb-10">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm({...form, template: t.id})}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${form.template === t.id ? 'border-black bg-gray-50' : 'border-gray-50'}`}
                  >
                    <span className="text-3xl mb-3 block">{t.icon}</span>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Version</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition font-bold"
                  placeholder="v1.2.0"
                  value={form.version}
                  onChange={e => setForm({...form, version: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Date</label>
                <input 
                  type="date" 
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition font-bold"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-8">
              {form.entries.map((entry, idx) => (
                <div key={entry.category} className="space-y-3">
                  <div className="flex items-center gap-2 pl-1">
                     <div className={`w-3 h-3 rounded-full ${entry.category === 'features' ? 'bg-green-500' : entry.category === 'fixes' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{entry.category}</label>
                  </div>
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none resize-none transition leading-relaxed"
                    placeholder={`What changed in ${entry.category}? Paste raw notes here...`}
                    value={entry.content}
                    onChange={e => handleEntryChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="mt-12 w-full py-6 bg-black text-white font-bold text-xl rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? "AI is processing..." : "Generate Release Notes"}
            </button>
            {error && <p className="text-red-500 text-sm mt-6 text-center font-bold bg-red-50 py-4 px-6 rounded-xl leading-relaxed">{error}</p>}
          </div>
        </section>

        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl min-h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 pb-8 border-b border-gray-50">
              <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl">
                {(['markdown', 'html', 'plainText'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              {result && (
                <button 
                  onClick={() => copyToClipboard(result[activeTab])}
                  className="px-6 py-2.5 text-xs font-bold text-black border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition active:scale-95 uppercase"
                >
                  Copy
                </button>
              )}
            </div>

            <div className="flex-1 bg-gray-50 rounded-2xl p-8 font-mono text-sm overflow-auto max-h-[700px]">
              {result ? (
                <pre className="whitespace-pre-wrap leading-loose text-gray-800 font-medium">{result[activeTab]}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow flex items-center justify-center">✨</div>
                  <p className="text-lg font-bold text-gray-400">Notes appear here after generation.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="bg-white border-t py-20 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center text-white font-black text-xs">L</div>
            <span className="text-lg font-bold">LogSpark</span>
          </div>
          <p className="text-gray-500 text-sm font-medium max-w-xs">Automate your release workflow with AI. The ultimate companion for indie hackers.</p>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Product</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('generator')} className="hover:text-black">Generator</button></li>
            <li><button onClick={() => setView('pricing')} className="hover:text-black">Pricing</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Legal</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('privacy')} className="hover:text-black">Privacy Policy</button></li>
            <li><button onClick={() => setView('disclaimer')} className="hover:text-black">Disclaimer</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Connect</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('about')} className="hover:text-black">About Us</button></li>
            <li><button onClick={() => setView('contact')} className="hover:text-black">Contact</button></li>
          </ul>
        </div>
      </div>
    </footer>
  );

  const renderContent = () => {
    switch (view) {
      case 'home': return renderHome();
      case 'generator': return renderGenerator();
      case 'pricing': return (
        <div className="max-w-6xl mx-auto py-20 px-4 text-center space-y-16 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h2 className="text-6xl font-black">Simple Pricing.</h2>
            <p className="text-xl text-gray-500 font-medium">Free while we're in beta. Upgrade anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_PLANS.map(p => (
              <div key={p.id} className={`bg-white p-10 rounded-[2.5rem] border-2 text-left flex flex-col ${p.recommended ? 'border-black shadow-2xl scale-105' : 'border-gray-100'}`}>
                <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                <div className="text-5xl font-black mb-10">{p.price}<span className="text-lg text-gray-400 font-bold tracking-normal">/mo</span></div>
                <ul className="space-y-5 mb-12 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-white text-[10px]">✓</div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setView('generator')} className={`w-full py-5 rounded-2xl font-bold transition-all ${p.recommended ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-black hover:bg-gray-200'}`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      );
      case 'contact': return renderLegal("Contact Us", (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Sent!"); setView('home'); }}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Name</label>
              <input type="text" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email</label>
              <input type="email" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none" placeholder="john@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Message</label>
            <textarea rows={6} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none resize-none" placeholder="How can we help?"></textarea>
          </div>
          <button type="submit" className="w-full py-5 bg-black text-white font-bold rounded-2xl shadow-xl">Send Message</button>
        </form>
      ));
      case 'about': return renderLegal("About Us", (
        <div className="space-y-6">
          <p>LogSpark was built by indie hackers for indie hackers. We know that documentation is the first thing to get skipped when you're moving fast, but it's the most important thing for your users.</p>
          <p>Our mission is to use modern AI to bridge the gap between technical commits and human value.</p>
        </div>
      ));
      case 'privacy': return renderLegal("Privacy Policy", (
        <div className="space-y-6">
          <p>Your privacy is important to us. We only store your data to provide the changelog generation service. Your commit messages are processed by Gemini AI but never used to train global models.</p>
          <p>We do not sell your data. We do not track you across other websites.</p>
        </div>
      ));
      case 'disclaimer': return renderLegal("Disclaimer", (
        <div className="space-y-6">
          <p>AI can make mistakes. Always review generated release notes before publishing them to your audience. LogSpark is a tool to assist, not replace, human judgment.</p>
        </div>
      ));
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 selection:bg-black selection:text-white">
      {renderNav()}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {renderContent()}
      </main>
      {renderFooter()}

      {/* Real Repository Fetching Modal */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Select Repository</h3>
                <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Public projects from ${user?.username}</p>
              </div>
              <button onClick={() => setShowRepoModal(false)} className="p-3 text-gray-400 hover:text-black hover:bg-gray-100 rounded-2xl transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
              {fetchingRepos ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-black border-t-transparent animate-spin rounded-full mx-auto"></div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching repositories...</p>
                </div>
              ) : repositories.length > 0 ? (
                repositories.map((repo) => (
                  <button 
                    key={repo.id}
                    onClick={() => {
                      setForm(f => ({...f, entries: f.entries.map(e => e.category === 'features' ? {...e, content: `feat: imported work from ${repo.name}\n${repo.description || ''}`} : e) }));
                      setShowRepoModal(false);
                    }}
                    className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-gray-50 hover:border-black hover:bg-gray-50 transition-all group text-left"
                  >
                    <div>
                      <span className="font-bold text-gray-900 block text-lg">{repo.name}</span>
                      <span className="text-xs text-gray-400 font-bold block mt-1">{repo.description || "No description"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-gray-900">⭐ {repo.stargazers_count}</span>
                       <svg className="w-5 h-5 text-gray-200 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center">
                  <p className="text-gray-400 font-bold">No public repositories found for this user.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
