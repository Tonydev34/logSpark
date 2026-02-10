
import React, { useState, useEffect, useCallback } from 'react';
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

const VIEW_TO_PATH: Record<AppView, string> = {
  home: '/',
  generator: '/generator',
  pricing: '/pricing',
  privacy: '/privacy',
  contact: '/contact',
  about: '/about',
  disclaimer: '/disclaimer'
};

// Fix: Cast view value to AppView to resolve type mismatch during reduction
const PATH_TO_VIEW: Record<string, AppView> = Object.entries(VIEW_TO_PATH).reduce(
  (acc, [view, path]) => ({ ...acc, [path]: view as AppView }),
  {} as Record<string, AppView>
);

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

  // Routing Logic
  const navigateTo = useCallback((newView: AppView) => {
    const path = VIEW_TO_PATH[newView] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ view: newView }, '', path);
    }
    setView(newView);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Initial Route sync
    const currentPath = window.location.pathname;
    const initialView = PATH_TO_VIEW[currentPath] || 'home';
    setView(initialView);

    const handlePopState = (event: PopStateEvent) => {
      const stateView = event.state?.view || PATH_TO_VIEW[window.location.pathname] || 'home';
      setView(stateView);
    };

    window.addEventListener('popstate', handlePopState);
    
    const savedUser = localStorage.getItem('logspark_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGitHubSignIn = () => {
    setIsAuthLoading('github');
    const width = 500, height = 650;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
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
          navigateTo('generator');
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
          navigateTo('generator');
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
    navigateTo('home');
  };

  const fetchRealRepositories = async () => {
    if (!user || user.provider !== 'github') return;
    setFetchingRepos(true);
    try {
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
      setError(`AI generation failed. ${err?.message || "Check Browser Console"}.`);
    } finally {
      setLoading(false);
    }
  };

  const renderNav = () => (
    <header className="bg-white/95 backdrop-blur-xl border-b sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigateTo('home')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:rotate-12 transition-transform">L</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">LogsGen</h1>
        </div>
        
        <nav className="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
          <button onClick={() => navigateTo('home')} className={`hover:text-black transition ${view === 'home' ? 'text-black font-bold' : ''}`}>Home</button>
          <button onClick={() => navigateTo('generator')} className={`hover:text-black transition ${view === 'generator' ? 'text-black font-bold' : ''}`}>Generator</button>
          <button onClick={() => navigateTo('pricing')} className={`hover:text-black transition ${view === 'pricing' ? 'text-black font-bold' : ''}`}>Pricing</button>
          <button onClick={() => navigateTo('about')} className={`hover:text-black transition ${view === 'about' ? 'text-black font-bold' : ''}`}>About</button>
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
              onClick={() => navigateTo('generator')}
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
    <div className="space-y-0 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[1.1]">
              A <span className="text-blue-600">Highly Customizable</span> <br className="hidden md:block"/>
              Changelog Generator ⛰️
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed">
              Transform your <strong>conventional commits</strong> into beautiful release notes. 
              Everything <strong>git-cliff can</strong> do, supercharged with AI.
            </p>
          </header>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => navigateTo('generator')}
              className="w-full sm:w-auto bg-black text-white px-10 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Get Started for Free
            </button>
            <button 
              onClick={() => navigateTo('pricing')}
              className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all shadow-md"
            >
              View Pricing
            </button>
          </div>
          
          <div className="pt-12 flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale">
            <span className="font-bold text-lg">GitHub Sync</span>
            <span className="font-bold text-lg">Conventional Commits</span>
            <span className="font-bold text-lg">Git-cliff Flow</span>
            <span className="font-bold text-lg">Markdown Export</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-gray-50 border-y border-gray-100 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Why Choose Our <span className="text-blue-600">Highly Customizable Changelog</span> Tool?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Automate your documentation workflow using <strong>conventional commits</strong> and smart AI analysis.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <article className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-blue-200 transition-all group">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">⚙️</div>
              <h3 className="text-2xl font-bold mb-4">Highly Customizable</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                LogSpark is a <strong>highly customizable changelog generator</strong> that fits any workflow. 
                Whether you use <strong>conventional commits</strong> or raw git history, our engine adapts.
              </p>
            </article>

            <article className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-green-200 transition-all group">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">⛰️</div>
              <h3 className="text-2xl font-bold mb-4">Powerful as Git-Cliff</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                LogSpark does what <strong>git-cliff can</strong> do, but with zero configuration. 
                Our <strong>changelog generator ⛰️</strong> handles regex and template parsing effortlessly.
              </p>
            </article>

            <article className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-purple-200 transition-all group">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">🚀</div>
              <h3 className="text-2xl font-bold mb-4">Instant Summaries</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Our <strong>highly customizable changelog generator</strong> uses Gemini to translate technical code into user-facing value. 
                Professional notes in seconds.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Semantic Content Block */}
      <section className="py-24 bg-gray-900 text-white px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">The Power of a Highly Customizable Changelog</h2>
            <p className="text-gray-400 text-lg">Mastering <strong>conventional commits</strong> for better releases.</p>
          </div>
          
          <div className="prose prose-invert max-w-none text-gray-400 space-y-6 text-lg leading-relaxed font-medium">
            <p>
              In modern software development, maintaining a <strong>highly customizable changelog generator</strong> is a necessity. 
              A <strong>customizable changelog generator</strong> allows teams to bridge the gap between technical commits and end-user value. 
              By adopting <strong>conventional commits</strong>, your <strong>⛰️ git-cliff</strong> flow or LogSpark automation becomes powerful.
            </p>
            <p>
              LogSpark provides what <strong>git-cliff can</strong> offer in terms of depth, but with a <strong>highly customizable changelog generator ⛰️</strong> 
              UI that makes it accessible to all. When you <strong>get started</strong> with LogSpark, 
              you gain access to <strong>a highly customizable</strong> environment where every detail can be tuned.
            </p>
            <p>
              Whether you build a small library or a massive SaaS, using <strong>a highly customizable changelog</strong> 
              ensures users always know what's new. Our <strong>highly customizable changelog generator</strong> 
              is designed to grow with you.
            </p>
            <p>
              Our <strong>customizable changelog generator ⛰️</strong> integrates <strong>conventional commits</strong> to produce 
              <strong>a highly customizable changelog</strong> that delights your audience. <strong>Get started</strong> today and see 
              how <strong>a highly customizable</strong> tool can change your release cycle.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8">
            {[
              { label: 'Keyword Focus', val: 'SEO Optimized' },
              { label: 'Style', val: 'Highly Customizable' },
              { label: 'Standard', val: 'Conventional' },
              { label: 'Speed', val: 'AI Powered' }
            ].map(stat => (
              <div key={stat.label} className="text-center p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="text-xl font-bold text-white mb-1">{stat.val}</div>
                <div className="text-xs text-gray-500 uppercase font-black tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 text-center px-4">
        <h2 className="text-4xl font-bold mb-8 tracking-tight">Ready to <strong>get started</strong>?</h2>
        <button 
          onClick={() => navigateTo('generator')}
          className="bg-black text-white px-12 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition shadow-xl"
        >
          Generate Your Changelog Now
        </button>
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
        <div className="mt-12 pt-8 border-t border-gray-100">
          <button onClick={() => navigateTo('home')} className="text-blue-600 font-bold hover:underline">← Back to Home</button>
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {!user && (
        <div className="p-12 rounded-[3rem] bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Connect Your Account</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">To fetch real repository data and sync your changes, please sign in.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={handleGitHubSignIn} className="w-full sm:w-auto bg-[#24292e] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all flex items-center justify-center gap-3">
                Sign in with GitHub
              </button>
              <button onClick={handleGoogleSignIn} className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-50 border border-gray-100 transition-all flex items-center justify-center gap-3">
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Template Style</label>
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
          <p className="text-gray-500 text-sm font-medium max-w-xs">A <strong>highly customizable changelog generator</strong> for modern product teams.</p>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Product</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => navigateTo('generator')} className="hover:text-black transition">Generator ⛰️</button></li>
            <li><button onClick={() => navigateTo('pricing')} className="hover:text-black transition">Pricing</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Legal</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => navigateTo('privacy')} className="hover:text-black transition">Privacy Policy</button></li>
            <li><button onClick={() => navigateTo('disclaimer')} className="hover:text-black transition">Disclaimer</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6">Connect</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => navigateTo('about')} className="hover:text-black transition">About Us</button></li>
            <li><button onClick={() => navigateTo('contact')} className="hover:text-black transition">Contact</button></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 border-t border-gray-50 pt-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
        &copy; {new Date().getFullYear()} LogSpark. All rights reserved.
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
            <p className="text-xl text-gray-500 font-medium">Try our <strong>highly customizable changelog generator</strong> today.</p>
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
                <button onClick={() => navigateTo('generator')} className={`w-full py-5 rounded-2xl font-bold transition-all ${p.recommended ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-black hover:bg-gray-200'}`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      );
      case 'about': return renderLegal("About LogSpark", (
        <div className="space-y-8">
          <p>
            LogSpark was created with a single mission: to make release notes as painless as possible. 
            We found that most developers spend hours debating <strong>conventional commits</strong> only to 
            forget to update their users on the actual progress.
          </p>
          <p>
            Our tool acts as a <strong>highly customizable changelog generator</strong> that bridges the 
            gap between code and communication. Inspired by what <strong>git-cliff can</strong> offer but 
            delivered through a friendly UI, LogSpark is for everyone.
          </p>
          <p>
            Whether you're a solo indie hacker or part of a growing SaaS team, LogSpark helps you maintain 
            a professional presence with zero effort. 
            <button onClick={() => navigateTo('generator')} className="text-blue-600 font-bold hover:underline ml-1">Get started today</button>.
          </p>
        </div>
      ));
      case 'contact': return renderLegal("Get in Touch", (
        <div className="space-y-8">
          <p>Have questions about our <strong>highly customizable changelog generator</strong>? We'd love to hear from you.</p>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks! We'll be in touch."); navigateTo('home'); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Name</label>
                <input required type="text" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-black" placeholder="Your Name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email</label>
                <input required type="email" className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-black" placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Message</label>
              <textarea required rows={5} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-black resize-none" placeholder="Tell us how we can help..."></textarea>
            </div>
            <button type="submit" className="w-full py-5 bg-black text-white font-bold rounded-2xl shadow-xl hover:bg-gray-800 transition">Send Message</button>
          </form>
        </div>
      ));
      case 'privacy': return renderLegal("Privacy Policy", (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold">Data Collection</h3>
          <p>
            LogSpark only stores the minimum data required to provide our service. 
            This includes basic profile info from your login provider (GitHub or Google) 
            to identify your account and save your preferences.
          </p>
          <h3 className="text-2xl font-bold">Release Notes Data</h3>
          <p>
            Content you enter into our <strong>highly customizable changelog generator</strong> is processed 
            by Gemini AI. We do not use your proprietary commit messages or release notes to 
            train models outside of your specific session.
          </p>
          <h3 className="text-2xl font-bold">Cookies</h3>
          <p>
            We use local storage and cookies strictly for authentication and maintaining your session.
          </p>
        </div>
      ));
      case 'disclaimer': return renderLegal("Disclaimer", (
        <div className="space-y-6">
          <p>
            The content generated by LogSpark's AI is based on user input. 
            While we strive for accuracy, LogSpark is not responsible for any inaccuracies 
            produced by the underlying AI model.
          </p>
          <p>
            Always review your changelog before publishing. LogSpark provides the 
            <strong>highly customizable</strong> framework, but final approval rests with you.
          </p>
          <p>
            Usage of the ⛰️ git-cliff name is for comparison and compatibility explanation only. 
            LogSpark is an independent product.
          </p>
        </div>
      ));
      default: return renderHome();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-blue-600 selection:text-white">
      {renderNav()}
      <main className="flex-1 w-full">
        {renderContent()}
      </main>
      {renderFooter()}

      {showRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Select Repository</h3>
                <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Public projects from {user?.username}</p>
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
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center">
                  <p className="text-gray-400 font-bold">No public repositories found.</p>
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
