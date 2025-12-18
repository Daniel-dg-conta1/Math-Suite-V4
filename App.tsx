import React, { useState, useEffect } from 'react';
import VectoraApp from './VectoraApp';
import TrigoApp from './TrigoApp';
import LoginScreen from './components/LoginScreen';
import { User } from './types';
import { supabase } from './utils/supabaseClient';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentModule, setCurrentModule] = useState<'home' | 'vectora' | 'trigo'>('home');
  
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
      }
      setLoadingSession(false);
    }).catch(err => {
      console.warn("Failed to check session:", err);
      setLoadingSession(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
      } else {
        setUser(null);
        setCurrentModule('home');
      }
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleLoginGoogle = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin 
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("Erro ao logar com Google:", error);
        alert("Erro ao conectar com Google. Verifique se o projeto Supabase está configurado corretamente.");
    }
  };

  const handleLoginGuest = () => {
    setUser({
      id: 'guest',
      name: 'Convidado',
      email: 'guest@mathsuite.app',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'
    });
  };

  const handleLogout = async () => {
    if (user?.id === 'guest') {
        setUser(null);
    } else {
        await supabase.auth.signOut();
    }
    setCurrentModule('home');
  };

  // --- LOADING SCREEN ---
  if (loadingSession) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#F5F7FA] dark:bg-slate-950">
              <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm animate-pulse">Carregando Math Suite...</p>
              </div>
          </div>
      );
  }

  // --- RENDER LOGIN IF NO USER ---
  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <LoginScreen onLoginGoogle={handleLoginGoogle} onLoginGuest={handleLoginGuest} onToggleTheme={toggleTheme} isDarkMode={darkMode} />
      </div>
    );
  }

  // --- MAIN APP UI ---
  return (
    <div className={`flex h-screen w-full bg-[#F5F7FA] dark:bg-slate-950 overflow-hidden font-sans animate-in fade-in duration-300 transition-colors`}>
      {/* Sidebar Navigation */}
      <div className="w-64 flex flex-col bg-slate-900 text-white border-r border-slate-800 shadow-2xl z-50 shrink-0">
        <div className="p-6 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setCurrentModule('home')}>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg">M</div>
             <h1 className="font-bold text-lg tracking-tight text-white">Math Suite <span className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-normal border border-slate-700">Pro</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentModule('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${currentModule === 'home' ? 'bg-slate-800 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'}`}
          >
            <span className="flex items-center justify-center w-6 h-6">🏠</span>
            Início
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Módulos</div>

          <button 
            onClick={() => setCurrentModule('vectora')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${currentModule === 'vectora' ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-900/50 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'}`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${currentModule === 'vectora' ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>↗</span>
            Vectora Pro
          </button>

          <button 
            onClick={() => setCurrentModule('trigo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${currentModule === 'trigo' ? 'bg-gradient-to-r from-teal-600 to-teal-500 shadow-lg shadow-teal-900/50 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'}`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${currentModule === 'trigo' ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>○</span>
            TrigoMestre
          </button>
        </nav>

        {/* Theme Toggle & User Profile */}
        <div className="p-4 border-t border-slate-800">
           {/* Dark Mode Toggle */}
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center gap-3 px-4 py-2 mb-4 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm active:scale-[0.98]"
           >
             <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
             {darkMode ? 'Modo Claro' : 'Modo Escuro'}
           </button>

           <div className="flex items-center gap-3 mb-4 px-2">
              <img src={user.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600" />
              <div className="flex-1 min-w-0">
                 <div className="text-sm font-bold text-white truncate">{user.name}</div>
                 <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
           </div>
           
           <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-colors active:scale-[0.98]"
           >
              <span>Sair da conta</span>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      {/* Key prop ensures component unmount/remount triggering CSS animations on switch */}
      <div key={currentModule} className="flex-1 h-full overflow-hidden relative bg-slate-50 dark:bg-slate-950 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        {currentModule === 'home' && (
          <div className="h-full w-full overflow-y-auto p-8 md:p-12 flex flex-col items-center justify-center">
             
             <div className="text-center max-w-2xl mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wide mb-4 animate-in zoom-in duration-500">
                  Bem-vindo, {user.name.split(' ')[0]}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                  Ferramentas Precisas para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Ciências Exatas</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Selecione um módulo abaixo para começar. Crie simulações, calcule resultados complexos e gere listas de exercícios em PDF prontos para impressão.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* VECTORA CARD */}
                <button 
                  onClick={() => setCurrentModule('vectora')}
                  className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-8 text-left hover:scale-[1.02] hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-2xl"></div>
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    ↗
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Vectora Pro</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Simulador vetorial completo. Decomposição cartesiana, soma de vetores, cálculo de resultantes e rotação de eixos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Física</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Vetores</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Mecânica</span>
                  </div>
                </button>

                {/* TRIGO CARD */}
                <button 
                  onClick={() => setCurrentModule('trigo')}
                  className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-8 text-left hover:scale-[1.02] hover:shadow-2xl hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-400 rounded-t-2xl"></div>
                  <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    ○
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">TrigoMestre</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Solucionador de triângulos inteligente. Resolve qualquer caso (Lei dos Senos, Cossenos) com visualização geométrica precisa.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Matemática</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Geometria</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded">Trigonometria</span>
                  </div>
                </button>
             </div>

             <div className="mt-16 text-slate-400 dark:text-slate-600 text-sm font-medium">
                Desenvolvido para Professores e Estudantes do Ensino Médio e Superior.
             </div>

          </div>
        )}
        {currentModule === 'vectora' && <VectoraApp isDarkMode={darkMode} />}
        {currentModule === 'trigo' && <TrigoApp isDarkMode={darkMode} />}
      </div>
    </div>
  );
};

export default App;