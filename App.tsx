
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

  const handleGitHubSignIn = () => {
    setIsAuthLoading('github');
    // Simulating "Original" Popup behavior
    const width = 600, height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const popup = window.open('about:blank', 'GitHub Sign In', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (popup) {
      popup.document.write('<div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;"><h3>Connecting to GitHub...</h3><p>Please wait while we authorize your account.</p></div>');
      setTimeout(() => {
        popup.close();
        const mockUser: User = {
          id: 'gh_12345',
          name: 'Alex Rivera',
          username: 'arivera_dev',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          provider: 'github'
        };
        setUser(mockUser);
        localStorage.setItem('logspark_user', JSON.stringify(mockUser));
        setIsAuthLoading(null);
        setView('generator');
      }, 2000);
    }
  };

  const handleGoogleSignIn = () => {
    setIsAuthLoading('google');
    // Simulating "Original" Popup behavior
    const width = 500, height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const popup = window.open('about:blank', 'Google Sign In', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (popup) {
      popup.document.write('<div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;"><h3>Signing in with Google...</h3></div>');
      setTimeout(() => {
        popup.close();
        const mockUser: User = {
          id: 'goog_67890',
          name: 'Alex Rivera',
          username: 'alex.rivera@gmail.com',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleAlex',
          provider: 'google'
        };
        setUser(mockUser);
        localStorage.setItem('logspark_user', JSON.stringify(mockUser));
        setIsAuthLoading(null);
        setView('generator');
      }, 1500);
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
    setFetchingRepos(true);
    try {
      const response = await fetch('https://api.github.com/users/google/repos?sort=updated&per_page=12');
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

  // Fix: handleEntryChange updates the content of a specific changelog entry category
  const handleEntryChange = (index: number, content: string) => {
    const newEntries = [...form.entries];
    newEntries[index] = { ...newEntries[index], content };
    setForm({ ...form, entries: newEntries });
  };

  // Fix: copyToClipboard utility for copying generated changelog text to clipboard
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
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
    } catch (err) {
      setError("AI generation failed. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const renderNav = () => (
    <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">L</div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">LogSpark</h1>
        </div>
        
        <nav className="hidden md:flex gap-8 text-sm font-bold text-gray-500">
          <button onClick={() => setView('home')} className={`hover:text-black transition ${view === 'home' ? 'text-black underline underline-offset-4' : ''}`}>Home</button>
          <button onClick={() => setView('generator')} className={`hover:text-black transition ${view === 'generator' ? 'text-black underline underline-offset-4' : ''}`}>Generator</button>
          <button onClick={() => setView('pricing')} className={`hover:text-black transition ${view === 'pricing' ? 'text-black underline underline-offset-4' : ''}`}>Pricing</button>
          <button onClick={() => setView('about')} className={`hover:text-black transition ${view === 'about' ? 'text-black underline underline-offset-4' : ''}`}>About</button>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-gray-900">{user.name}</p>
                <button onClick={handleSignOut} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-wider transition">Sign Out</button>
              </div>
              <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full border-2 border-white ring-1 ring-gray-100 shadow-sm" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleGitHubSignIn}
                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className="bg-white border-t py-20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center text-white font-black text-xs">L</div>
            <span className="text-lg font-black tracking-tight">LogSpark</span>
          </div>
          <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed">The ultimate AI-powered changelog generator for modern SaaS teams. Ship updates with confidence.</p>
        </div>
        <div>
          <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-6">Product</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('generator')} className="hover:text-black">Generator</button></li>
            <li><button onClick={() => setView('pricing')} className="hover:text-black">Pricing</button></li>
            <li><a href="#" className="hover:text-black">Templates</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-6">Support</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('contact')} className="hover:text-black">Contact Us</button></li>
            <li><button onClick={() => setView('privacy')} className="hover:text-black">Privacy Policy</button></li>
            <li><button onClick={() => setView('disclaimer')} className="hover:text-black">Disclaimer</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-6">Company</h4>
          <ul className="space-y-4 text-sm font-bold text-gray-500">
            <li><button onClick={() => setView('about')} className="hover:text-black">About Us</button></li>
            <li><a href="#" className="hover:text-black">Twitter</a></li>
            <li><a href="#" className="hover:text-black">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 pt-8 border-t flex flex-col md:flex-row justify-between items-center text-xs font-bold text-gray-400">
        <p>© 2024 LogSpark Inc. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0 uppercase tracking-widest">
          <span>Made with ❤️ for indie hackers</span>
        </div>
      </div>
    </footer>
  );

  const renderHome = () => (
    <div className="space-y-32 py-20 px-4">
      <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs font-black uppercase tracking-widest text-gray-600 mb-4 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          Now with AI-Powered Summaries
        </div>
        <h2 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.9]">
          Release Notes <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">Simplified.</span>
        </h2>
        <p className="text-gray-500 text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
          LogSpark turns your messy git commits into professional, user-friendly changelogs in under 30 seconds. No more technical jargon, just value.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => setView('generator')}
            className="w-full sm:w-auto bg-black text-white px-10 py-5 rounded-2xl font-black text-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-black/20 shadow-xl"
          >
            Start Generating Free
          </button>
          <button 
            onClick={() => setView('pricing')}
            className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-black text-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gray-100"
          >
            View Pricing
          </button>
        </div>
        
        <div className="pt-20 max-w-5xl mx-auto">
          <div className="relative p-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-[2.5rem] shadow-inner overflow-hidden">
            <div className="bg-white rounded-[2.2rem] p-4 shadow-2xl overflow-hidden border">
              <img src="https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=2000" className="w-full rounded-[1.8rem] border shadow-sm opacity-90" alt="Dashboard Preview" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
               <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4.5 3.5v13l11-6.5-11-6.5z"/></svg>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {[
          { icon: '🤖', title: 'AI Intelligence', desc: 'Gemini AI automatically groups and rephrases technical commits into benefit-driven language.' },
          { icon: '🔗', title: 'Deep Integration', desc: 'Connect directly to GitHub or Google to sync repositories and fetch commit history instantly.' },
          { icon: '🎨', title: 'Smart Templates', desc: 'Choose from Technical, Marketing, or Minimal templates tailored for your audience.' }
        ].map(f => (
          <div key={f.title} className="bg-white p-10 rounded-[2rem] border-2 border-gray-50 hover:border-black transition-all group shadow-xl shadow-gray-100">
            <div className="text-4xl mb-6 bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">{f.icon}</div>
            <h3 className="text-2xl font-black mb-4 group-hover:text-black">{f.title}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-black text-white p-16 md:p-24 rounded-[3rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">Ready to ship better updates?</h2>
          <p className="text-gray-400 text-xl font-medium max-w-2xl mx-auto">Join 500+ indie hackers using LogSpark to keep their customers informed and engaged.</p>
          <button onClick={() => setView('generator')} className="bg-white text-black px-12 py-6 rounded-2xl font-black text-xl hover:bg-gray-100 transition shadow-2xl shadow-white/10 active:scale-95">Get Started for Free</button>
        </div>
      </section>
    </div>
  );

  const renderPricing = () => (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-12 text-center animate-in fade-in duration-500">
      <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter">Pricing that scales with you.</h2>
      <p className="text-gray-500 text-xl mb-16 font-medium">No hidden fees. No complicated tiers. Just pure value.</p>
      
      <div className="grid md:grid-cols-3 gap-8">
        {PRICING_PLANS.map(plan => (
          <div key={plan.id} className={`bg-white p-8 rounded-[2rem] border-2 flex flex-col text-left transition-all ${plan.recommended ? 'border-black shadow-2xl scale-105 relative' : 'border-gray-50 shadow-xl'}`}>
            {plan.recommended && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">Most Popular</span>
            )}
            <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
              <span className="text-gray-400 font-bold text-sm tracking-widest uppercase">/mo</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-gray-600 text-sm font-bold">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setView('generator')} className={`w-full py-5 rounded-2xl font-black text-sm transition-all active:scale-95 ${plan.recommended ? 'bg-black text-white hover:bg-gray-800 shadow-xl shadow-black/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
              {plan.id === 'starter' ? 'Start Free' : 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="max-w-4xl mx-auto py-20 px-4 animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[2.5rem] border shadow-2xl shadow-gray-100">
        <h2 className="text-4xl font-black mb-4">Contact Us</h2>
        <p className="text-gray-500 font-medium mb-10">Have questions or feedback? We'd love to hear from you. Send us a message and we'll get back to you within 24 hours.</p>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => { e.preventDefault(); alert("Message sent!"); setView('home'); }}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">Full Name</label>
            <input type="text" required className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition font-bold" placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">Email Address</label>
            <input type="email" required className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition font-bold" placeholder="john@example.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">Message</label>
            <textarea required rows={6} className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition font-bold resize-none" placeholder="Tell us what's on your mind..."></textarea>
          </div>
          <button type="submit" className="md:col-span-2 w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition shadow-xl active:scale-95">Send Message</button>
        </form>
      </div>
    </div>
  );

  const renderContentPage = (title: string, content: React.ReactNode) => (
    <div className="max-w-4xl mx-auto py-20 px-4 animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[2.5rem] border shadow-2xl shadow-gray-100 prose prose-gray max-w-none">
        <h2 className="text-5xl font-black mb-8 tracking-tighter">{title}</h2>
        <div className="text-gray-600 font-medium leading-relaxed space-y-6">
          {content}
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {!user && (
        <div className="p-12 rounded-[3rem] bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-center shadow-2xl overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none rotate-12">
            <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-5xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Unlock Full Potential.</h2>
            <p className="text-gray-400 text-xl mb-10 leading-relaxed font-medium">Connect your GitHub or Google account to sync repositories, automate releases, and get high-fidelity AI summaries.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleGitHubSignIn}
                disabled={!!isAuthLoading}
                className="w-full sm:w-auto bg-white text-black px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
              >
                Continue with GitHub
              </button>
              <button 
                onClick={handleGoogleSignIn}
                className="w-full sm:w-auto bg-gray-50 text-gray-900 px-10 py-5 rounded-2xl font-black text-lg hover:bg-white border-2 border-transparent hover:border-gray-100 transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Configure Release</h2>
              {user && (
                <button 
                  onClick={() => setShowRepoModal(true)}
                  className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl hover:bg-blue-100 transition-colors flex items-center gap-2 uppercase tracking-widest"
                >
                  Import From GitHub
                </button>
              )}
            </div>

            <div className="mb-10">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Output Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm({...form, template: t.id})}
                    className={`p-5 rounded-3xl border-2 text-left transition-all ${form.template === t.id ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-50 hover:border-gray-200'}`}
                  >
                    <span className="text-3xl mb-3 block">{t.icon}</span>
                    <p className="font-black text-sm text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-500 mt-1 font-bold leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Version Name</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition text-sm font-black placeholder-gray-300 shadow-inner"
                  placeholder="v1.2.0"
                  value={form.version}
                  onChange={e => setForm({...form, version: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Release Date</label>
                <input 
                  type="date" 
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none transition text-sm font-black shadow-inner"
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
                     <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{entry.category}</label>
                  </div>
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-5 bg-gray-50 border-0 rounded-[1.8rem] focus:ring-2 focus:ring-black outline-none resize-none text-sm transition leading-relaxed placeholder-gray-300 shadow-inner font-medium"
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
              className="mt-12 w-full py-6 bg-black text-white font-black text-xl rounded-3xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-black/10 active:scale-[0.98]"
            >
              {loading ? "Generating Magic..." : "Generate Professional Changelog"}
            </button>
            {error && <p className="text-red-500 text-sm mt-6 text-center font-black bg-red-50 py-4 rounded-2xl">{error}</p>}
          </div>
        </section>

        <section className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 min-h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 pb-8 border-b border-gray-50">
              <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
                {(['markdown', 'html', 'plainText'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === tab ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              {result && (
                <button 
                  onClick={() => copyToClipboard(result[activeTab])}
                  className="w-full sm:w-auto text-xs font-black text-black border-2 border-gray-100 px-6 py-2.5 rounded-2xl hover:bg-gray-50 transition active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  Copy
                </button>
              )}
            </div>

            <div className="flex-1 bg-gray-50/50 rounded-[2rem] p-8 font-mono text-sm overflow-auto max-h-[700px] border border-gray-100 selection:bg-black selection:text-white">
              {result ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <pre className="whitespace-pre-wrap leading-loose text-gray-800 font-medium">{result[activeTab]}</pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center px-8 py-20 space-y-6">
                  <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-gray-50 flex items-center justify-center">
                    <svg className="w-12 h-12 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900 mb-2">Ready to ship?</p>
                    <p className="text-sm font-bold opacity-60">Fill in the form to generate your <br />first professional release note.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'generator': return renderGenerator();
      case 'pricing': return renderPricing();
      case 'contact': return renderContact();
      case 'about': return renderContentPage("About Us", (
        <>
          <p>LogSpark was founded by a group of indie hackers who were tired of the tedious task of writing changelogs every time they shipped a new feature. We realized that while building is fun, documenting can be a drag—yet it's crucial for customer trust and SEO.</p>
          <p>Our mission is to empower developers and SaaS founders to communicate their progress effortlessly. Using state-of-the-art AI, we translate technical complexity into human benefit.</p>
          <h3>Our Values</h3>
          <ul>
            <li><strong>Speed:</strong> Documentation should never slow you down.</li>
            <li><strong>Clarity:</strong> Your customers care about value, not commit hashes.</li>
            <li><strong>Simplicity:</strong> A tool that gets out of your way.</li>
          </ul>
        </>
      ));
      case 'privacy': return renderContentPage("Privacy Policy", (
        <>
          <p>Last updated: October 2023</p>
          <p>At LogSpark, we take your privacy seriously. This policy describes how we collect, use, and handle your data when you use our services.</p>
          <h3>1. Data Collection</h3>
          <p>We collect basic information like your email and name when you sign in via GitHub or Google. We also store the changelog content you generate to provide version history (Pro tier).</p>
          <h3>2. AI Usage</h3>
          <p>Your raw commit messages are sent to Gemini AI for processing. This data is not used to train the model and is treated as transient unless you save it to your dashboard.</p>
          <h3>3. Security</h3>
          <p>We use industry-standard encryption to protect your data both at rest and in transit.</p>
        </>
      ));
      case 'disclaimer': return renderContentPage("Disclaimer", (
        <>
          <p>LogSpark is provided "as is" without any warranties of any kind. While we strive for 100% accuracy in AI generation, we recommend reviewing all generated content before publishing.</p>
          <p>We are not responsible for any issues arising from the use of AI-generated text or the connection to external repository providers.</p>
        </>
      ));
      case 'home':
      default: return renderHome();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/20 selection:bg-black selection:text-white">
      {renderNav()}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {renderContent()}
      </main>
      {renderFooter()}

      {/* Repo Selector Modal */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Import Repository</h3>
                <p className="text-gray-400 text-sm font-bold mt-1">Select a real project from GitHub</p>
              </div>
              <button onClick={() => setShowRepoModal(false)} className="p-3 text-gray-400 hover:text-black hover:bg-gray-100 rounded-2xl transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="space-y-4 max-h-[450px] overflow-auto mb-8 pr-2 custom-scrollbar">
              {fetchingRepos ? (
                <div className="py-24 text-center space-y-6">
                  <svg className="animate-spin h-10 w-10 text-black mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p className="text-lg font-black text-gray-400">Fetching your repositories...</p>
                </div>
              ) : repositories.length > 0 ? (
                repositories.map((repo) => (
                  <button 
                    key={repo.id}
                    onClick={() => { setForm(f => ({...f, entries: f.entries.map(e => e.category === 'features' ? {...e, content: `feat: sync data from ${repo.name}\nfeat: update schema for ${repo.name}`} : e) })); setShowRepoModal(false); }}
                    className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-gray-50 hover:border-black hover:bg-gray-50 transition-all group text-left"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm bg-white border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">📁</div>
                      <div className="overflow-hidden">
                        <span className="font-black text-gray-900 block truncate max-w-[200px] text-lg">{repo.name}</span>
                        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest block truncate max-w-[200px] mt-1">{repo.description || "No description provided"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-end">
                         <span className="text-xs font-black text-gray-900">⭐ {repo.stargazers_count}</span>
                         <span className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-1">Public</span>
                       </div>
                       <svg className="w-6 h-6 text-gray-200 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-24 text-center text-gray-300 font-black text-xl italic">No public repositories found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
