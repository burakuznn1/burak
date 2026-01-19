
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, TrendingUp, LogOut, 
  Sparkles, MapPin, MessageSquare, Phone, 
  Eye, Heart, Navigation, Clock, Info, Save, Edit3, Send, Lock, Unlock,
  Coins, ClipboardCheck, History, CheckCircle2, XCircle, ThumbsUp, Plus, Trash2, Copy, 
  ExternalLink, Search, Home, Tag, ChevronRight, Check, X, Award, Share2, Building2, Layers,
  TrendingDown, ArrowUpRight, Key, Menu
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Property, PropertyStats, Offer, SurveyResponse, ClientReport } from './types';
import { generateReportSummary } from './services/geminiService';

const ADMIN_PASSWORD = "west";

const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'west-101',
    title: 'Lüks Deniz Manzaralı Daire',
    location: 'Beşiktaş, Yıldız Mahallesi',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    currentPrice: 18500000,
    agentNotes: "Mülkümüz bu ay ciddi bir ivme kazandı. Gelen teklifler nakit alım üzerine yoğunlaşıyor. Fiyatı korumaya devam ediyoruz.",
    clientFeedback: [],
    offers: [
      { id: '1', date: '2024-06-05', amount: 17200000, bidder: "Yatırımcı A", status: 'Reddedildi' },
      { id: '2', date: '2024-06-12', amount: 17800000, bidder: "Bireysel Alıcı B", status: 'Beklemede' },
    ],
    surveyResponse: {
      priceSatisfaction: 3.5,
      paymentTermsSatisfaction: 4.2,
      presentationSatisfaction: 4.8,
      generalNote: "Piyasa fiyatı makul bulunuyor, ancak bölgedeki yeni projeler takip edilmeli."
    },
    stats: [
      { month: 'Nis', views: 420, favorites: 30, messages: 5, calls: 4, visits: 2 },
      { month: 'May', views: 750, favorites: 55, messages: 15, calls: 11, visits: 6 },
      { month: 'Haz', views: 820, favorites: 68, messages: 18, calls: 14, visits: 8 },
    ],
    market: { comparablePrice: 17800000, buildingUnitsCount: 2, neighborhoodUnitsCount: 14, avgSaleDurationDays: 45 }
  }
];

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('west_properties');
    return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'notes' | 'propertyList'>('dashboard');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [clientCodeInput, setClientCodeInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [clientError, setClientError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isClientMode, setIsClientMode] = useState(false);

  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newOffer, setNewOffer] = useState({ 
    amount: 0, bidder: "", date: new Date().toISOString().split('T')[0], status: 'Beklemede' as any
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('p');
    if (pId) {
      const found = properties.find(p => p.id === pId);
      if (found) {
        setSelectedPropertyId(pId);
        setIsClientMode(true);
        setActiveTab('dashboard');
      }
    } else if (!isAdminAuthenticated && !selectedPropertyId) {
      setActiveTab('propertyList');
    }
  }, [properties, isAdminAuthenticated, selectedPropertyId]);

  useEffect(() => {
    localStorage.setItem('west_properties', JSON.stringify(properties));
  }, [properties]);

  const currentProperty = useMemo(() => 
    properties.find(p => p.id === selectedPropertyId), 
  [properties, selectedPropertyId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setLoginError(false);
      setActiveTab('propertyList');
      setIsClientMode(false);
      setPasswordInput("");
    } else { setLoginError(true); }
  };

  const handleClientAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const found = properties.find(p => p.id.toLowerCase() === clientCodeInput.toLowerCase());
    if (found) {
      setSelectedPropertyId(found.id);
      setIsClientMode(true);
      setActiveTab('dashboard');
      setClientError(false);
      setClientCodeInput("");
    } else {
      setClientError(true);
      setTimeout(() => setClientError(false), 2000);
    }
  };

  const updateProperty = (updated: Property) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deleteOffer = (offerId: string) => {
    if (!currentProperty) return;
    const updated = { ...currentProperty, offers: currentProperty.offers.filter(o => o.id !== offerId) };
    updateProperty(updated);
  };

  const updateOfferStatus = (offerId: string, status: any) => {
    if (!currentProperty) return;
    const updated = { ...currentProperty, offers: currentProperty.offers.map(o => o.id === offerId ? { ...o, status } : o) };
    updateProperty(updated);
  };

  const handleAddProperty = () => {
    const newId = `west-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProperty: Property = {
      id: newId,
      title: 'Yeni Portföy İsmi',
      location: 'Konum Giriniz',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80',
      currentPrice: 0,
      agentNotes: "",
      clientFeedback: [],
      offers: [],
      stats: [
        { month: 'Haz', views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }
      ],
      market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }
    };
    setProperties([...properties, newProperty]);
    setSelectedPropertyId(newId);
    setActiveTab('admin');
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLatestStats = () => {
    if (!currentProperty) return null;
    return currentProperty.stats[currentProperty.stats.length - 1];
  };

  const getPreviousStats = () => {
    if (!currentProperty || currentProperty.stats.length < 2) return null;
    return currentProperty.stats[currentProperty.stats.length - 2];
  };

  const stats = getLatestStats();
  const prevStats = getPreviousStats();

  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-[#002B5B] to-[#001E3C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Award className="text-[#001E3C]" size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider">TÜRKWEST</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Lüks Konut Grubu</p>
            </div>
          </div>
        </div>
        
        <nav className="p-6 space-y-2 flex-1">
          {isClientMode ? (
            <NavItem icon={<LayoutDashboard size={20} />} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          ) : (
            <>
              <NavItem icon={<Home size={20} />} label="Portföy Merkezi" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
              {selectedPropertyId && (
                <>
                  <div className="mt-8 mb-2 px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Düzenleme</div>
                  <NavItem icon={<Edit3 size={18} />} label="Veri & Teklifler" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
                  <NavItem icon={<Sparkles size={18} />} label="Strateji Notu" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                  <NavItem icon={<Eye size={18} />} label="Raporu Önizle" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5">
          {isAdminAuthenticated ? (
             <button onClick={() => { setIsAdminAuthenticated(false); setActiveTab('propertyList'); setSelectedPropertyId(null); setIsClientMode(false); }} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">
                <LogOut size={16} /> Güvenli Çıkış
             </button>
          ) : !isClientMode && (
            <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Lock size={14} /> Yönetici Girişi
            </button>
          )}
          {isClientMode && (
             <button onClick={() => { setIsClientMode(false); setSelectedPropertyId(null); }} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
               <X size={14} /> Rapordan Ayrıl
             </button>
          )}
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="lg:hidden bg-[#001E3C] text-white p-4 sticky top-0 z-[60] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Award className="text-white" size={24} />
          <h1 className="font-black text-sm tracking-wider uppercase">Türkwest</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdminAuthenticated && (
            <button onClick={() => { setIsAdminAuthenticated(false); setActiveTab('propertyList'); setSelectedPropertyId(null); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <LogOut size={18} />
            </button>
          )}
          {!isAdminAuthenticated && !isClientMode && (
            <button onClick={() => setShowLoginModal(true)} className="p-2 bg-white/10 rounded-lg">
              <Lock size={18} />
            </button>
          )}
          {isClientMode && (
             <button onClick={() => { setIsClientMode(false); setSelectedPropertyId(null); }} className="p-2 bg-white/10 rounded-lg">
               <X size={18} />
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-24 lg:pb-10 overflow-x-hidden">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && currentProperty && stats && (
          <div className="max-w-6xl mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">Performans Analizi</span>
                <h2 className="text-2xl lg:text-4xl font-black text-[#001E3C] tracking-tight leading-tight">{currentProperty.title}</h2>
                <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-slate-500 text-sm font-medium">
                  <span className="flex items-center gap-1.5"><MapPin size={16} className="text-[#001E3C]"/> {currentProperty.location}</span>
                  <span className="hidden lg:block w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="font-black text-[#001E3C] text-lg">₺{currentProperty.currentPrice.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={async () => { setIsGenerating(true); setAiSummary(await generateReportSummary({ property: currentProperty, period: 'Haziran 2024', clientName: 'Değerli Ortağımız' })); setIsGenerating(false); }}
                className="w-full lg:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#001E3C] to-[#003366] text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all"
              >
                {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Sparkles size={20} className="text-amber-400" />}
                <span>AI Stratejik Analiz</span>
              </button>
            </div>

            {/* Core Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              <StatCard label="Görüntü" value={stats.views} change={calculateChange(stats.views, prevStats?.views)} icon={<Eye size={20}/>} color="blue" />
              <StatCard label="Favori" value={stats.favorites} change={calculateChange(stats.favorites, prevStats?.favorites)} icon={<Heart size={20}/>} color="red" />
              <StatCard label="İletişim" value={stats.messages + stats.calls} change={calculateChange(stats.messages + stats.calls, (prevStats?.messages || 0) + (prevStats?.calls || 0))} icon={<MessageSquare size={20}/>} color="indigo" />
              <StatCard label="Gezme" value={stats.visits} change={calculateChange(stats.visits, prevStats?.visits)} icon={<Navigation size={20}/>} color="emerald" />
            </div>

            {/* Charts and Market Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
               <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                  {/* Chart */}
                  <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border border-slate-200/60">
                    <div className="mb-6 lg:mb-8">
                        <h4 className="text-lg lg:text-xl font-black text-[#001E3C]">İlgi Trendi</h4>
                        <p className="text-xs text-slate-400 font-medium">Aylık performans değişimi</p>
                    </div>
                    <div className="h-[250px] lg:h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentProperty.stats}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorFavs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}} />
                          <Area name="Görüntüleme" type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                          <Area name="Favori" type="monotone" dataKey="favorites" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorFavs)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Offers */}
                  <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border border-slate-200/60">
                    <div className="flex items-center justify-between mb-6 lg:mb-8">
                       <h4 className="text-lg lg:text-xl font-black text-[#001E3C] flex items-center gap-2"><Coins size={20} className="text-amber-500"/> Teklifler</h4>
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">{currentProperty.offers.length} TOPLAM</span>
                    </div>
                    <div className="space-y-3 lg:space-y-4">
                      {currentProperty.offers.length > 0 ? currentProperty.offers.map(offer => (
                        <div key={offer.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 lg:p-6 bg-slate-50 rounded-2xl lg:rounded-[2rem] border border-transparent gap-3 lg:gap-0">
                          <div className="flex items-center gap-4 lg:gap-6">
                            <div className="p-3 lg:p-4 bg-white rounded-xl shadow-sm"><History size={20} className="text-[#001E3C]"/></div>
                            <div>
                              <p className="text-lg lg:text-2xl font-black text-[#001E3C]">₺{offer.amount.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{offer.date} • {offer.bidder}</p>
                            </div>
                          </div>
                          <span className={`self-start sm:self-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            offer.status === 'Reddedildi' ? 'bg-red-100 text-red-600' : 
                            offer.status === 'Kabul Edildi' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                          }`}>{offer.status}</span>
                        </div>
                      )) : <p className="text-center py-6 text-slate-400 italic text-sm font-medium">Teklif bulunmamaktadır.</p>}
                    </div>
                  </div>
               </div>

               {/* Right Column / Mobile Scroll Order */}
               <div className="space-y-6 lg:space-y-8">
                  {/* Market Analysis */}
                  <div className="bg-[#001E3C] p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] text-white space-y-6 shadow-xl relative overflow-hidden">
                     <Building2 size={80} className="absolute -right-5 -bottom-5 opacity-10" />
                     <h4 className="text-base lg:text-lg font-black flex items-center gap-2"><TrendingUp size={20} className="text-emerald-400"/> Piyasa Konumu</h4>
                     <div className="space-y-3 relative z-10">
                        <MarketCard icon={<Building2 size={16}/>} label="Binadaki İlanlar" value={currentProperty.market.buildingUnitsCount} />
                        <MarketCard icon={<Layers size={16}/>} label="Mahalledeki İlanlar" value={currentProperty.market.neighborhoodUnitsCount} />
                        <MarketCard icon={<Clock size={16}/>} label="Satış Süresi" value={`${currentProperty.market.avgSaleDurationDays} Gün`} />
                        <div className="pt-4 border-t border-white/10">
                           <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Emsal Fiyat</p>
                           <p className="text-lg lg:text-xl font-black">₺{currentProperty.market.comparablePrice.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>

                  {/* Survey Responses */}
                  <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border border-slate-200/60">
                    <h4 className="text-base lg:text-lg font-black text-[#001E3C] mb-6 flex items-center gap-2"><ClipboardCheck size={20} className="text-blue-500"/> Pazar Algısı</h4>
                    {currentProperty.surveyResponse ? (
                      <div className="space-y-5">
                        <ScoreMeter label="Fiyat Memnuniyeti" score={currentProperty.surveyResponse.priceSatisfaction} />
                        <ScoreMeter label="Ödeme Şartları" score={currentProperty.surveyResponse.paymentTermsSatisfaction} />
                        <ScoreMeter label="Sunum & Kalite" score={currentProperty.surveyResponse.presentationSatisfaction} />
                      </div>
                    ) : <p className="text-center py-6 text-xs text-slate-400 italic">Analiz aşamasında...</p>}
                  </div>

                  {/* Agent Contact Card */}
                  <div className="bg-emerald-500 p-6 rounded-[2rem] text-white flex items-center gap-4 shadow-lg shadow-emerald-500/20">
                     <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><Phone size={24}/></div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Danışman Desteği</p>
                        <p className="font-bold text-lg leading-tight">İletişime Geç</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* AI Analysis Summary */}
            {aiSummary && (
              <div className="bg-white p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] border-2 border-[#001E3C]/5 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 text-[#001E3C]/5 group-hover:scale-110 transition-transform"><Sparkles size={100} /></div>
                 <div className="relative z-10 space-y-6">
                    <h3 className="text-xl lg:text-2xl font-black text-[#001E3C] flex items-center gap-3"><Sparkles size={24} className="text-amber-500"/> AI Strateji Raporu</h3>
                    <div className="text-base lg:text-lg leading-relaxed text-slate-700 font-medium whitespace-pre-wrap border-l-4 border-[#001E3C] pl-6 lg:pl-8">
                      {aiSummary}
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Property List */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-6">
              <div>
                <h2 className="text-3xl lg:text-4xl font-black text-[#001E3C] tracking-tight">Portföy Merkezi</h2>
                <p className="text-slate-500 mt-2 font-medium">Aktif ilanlarınızı yönetin.</p>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="İlan ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#001E3C] transition-all font-medium text-sm"
                    />
                 </div>
                 <button onClick={handleAddProperty} className="w-full md:w-auto px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                    <Plus size={20}/> Yeni İlan
                 </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredProperties.map(p => (
                <div key={p.id} className="group bg-white rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-sm transition-all relative">
                   <div className="h-48 lg:h-52 relative overflow-hidden">
                      <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                      <div className="absolute top-4 right-4 px-3 py-1 bg-[#001E3C] text-white rounded-full text-[10px] font-black uppercase tracking-tighter">KOD: {p.id}</div>
                   </div>
                   <div className="p-6 lg:p-8 space-y-6">
                      <div>
                        <h4 className="font-black text-lg text-[#001E3C] truncate">{p.title}</h4>
                        <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1"><MapPin size={12}/> {p.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] lg:text-[11px] font-bold hover:bg-blue-50 hover:text-blue-600 transition-all">Analiz</button>
                        <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('admin'); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] lg:text-[11px] font-bold hover:bg-amber-50 hover:text-amber-600 transition-all">Düzenle</button>
                        <button onClick={() => { 
                          const url = `${window.location.origin}${window.location.pathname}?p=${p.id}`;
                          navigator.clipboard.writeText(url);
                          alert(`Rapor linki kopyalandı!`);
                        }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-emerald-500 transition-all"><Copy size={16}/></button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Data Entry Panel */}
        {activeTab === 'admin' && currentProperty && (
           <div className="max-w-4xl mx-auto space-y-6 lg:space-y-10 pb-10 lg:pb-20 animate-in slide-in-from-bottom-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                 <div>
                    <h3 className="text-2xl lg:text-3xl font-black text-[#001E3C]">Veri Yönetimi</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Kod: {currentProperty.id}</p>
                 </div>
                 <button onClick={() => setActiveTab('propertyList')} className="self-start px-4 py-2 text-slate-400 font-bold hover:text-slate-600 transition-all flex items-center gap-2"><ChevronRight className="rotate-180" size={18}/> Listeye Dön</button>
              </div>

              {/* Form Cards */}
              <div className="space-y-4 lg:space-y-6">
                <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-sm border border-slate-200/60 space-y-6">
                   <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-[#001E3C]"/> Performans Verileri</h4>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <AdminInput label="Görüntü" value={currentProperty.stats[currentProperty.stats.length-1].views} type="number" onChange={v => { const s = [...currentProperty.stats]; s[s.length-1].views = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                      <AdminInput label="Favori" value={currentProperty.stats[currentProperty.stats.length-1].favorites} type="number" onChange={v => { const s = [...currentProperty.stats]; s[s.length-1].favorites = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                      <AdminInput label="Mesaj" value={currentProperty.stats[currentProperty.stats.length-1].messages} type="number" onChange={v => { const s = [...currentProperty.stats]; s[s.length-1].messages = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                      <AdminInput label="Arama" value={currentProperty.stats[currentProperty.stats.length-1].calls} type="number" onChange={v => { const s = [...currentProperty.stats]; s[s.length-1].calls = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                      <AdminInput label="Ziyaret" value={currentProperty.stats[currentProperty.stats.length-1].visits} type="number" onChange={v => { const s = [...currentProperty.stats]; s[s.length-1].visits = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                   </div>
                </div>

                <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-sm border border-slate-200/60 space-y-6">
                   <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-[#001E3C]"/> Piyasa Durumu</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AdminInput label="Binadaki İlanlar" value={currentProperty.market.buildingUnitsCount} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, buildingUnitsCount: Number(v)}})} />
                      <AdminInput label="Mahalledeki İlanlar" value={currentProperty.market.neighborhoodUnitsCount} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, neighborhoodUnitsCount: Number(v)}})} />
                      <AdminInput label="Satış Süresi (Gün)" value={currentProperty.market.avgSaleDurationDays} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, avgSaleDurationDays: Number(v)}})} />
                   </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                 <button onClick={() => setActiveTab('dashboard')} className="flex-1 py-4 lg:py-5 bg-[#001E3C] text-white rounded-2xl lg:rounded-[2rem] font-black shadow-xl">Kaydet ve Görüntüle</button>
                 <button onClick={() => setActiveTab('notes')} className="flex-1 py-4 lg:py-5 bg-slate-100 text-[#001E3C] rounded-2xl lg:rounded-[2rem] font-black">Strateji Notu Yaz</button>
              </div>
           </div>
        )}

        {/* Strategy Notes Panel */}
        {activeTab === 'notes' && currentProperty && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-6">
             <div className="bg-white p-6 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] shadow-sm border border-slate-200/60 space-y-6 lg:space-y-8">
                <h3 className="text-2xl lg:text-3xl font-black text-[#001E3C]">Strateji & Notlar</h3>
                <textarea value={currentProperty.agentNotes} onChange={e => updateProperty({...currentProperty, agentNotes: e.target.value})} 
                  className="w-full h-64 lg:h-80 p-6 lg:p-10 bg-slate-50 rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-100 focus:border-[#001E3C] outline-none text-base lg:text-xl font-medium leading-relaxed" 
                  placeholder="Mülk sahibi için görüşlerinizi yazın..." 
                />
                <button onClick={() => setActiveTab('dashboard')} className="w-full py-4 lg:py-5 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl">Kaydet ve Geri Dön</button>
             </div>
          </div>
        )}

        {/* Client Access Landing */}
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 lg:p-6 animate-in fade-in duration-1000">
             <div className="w-20 lg:w-24 h-20 lg:h-24 bg-[#001E3C] rounded-[2rem] lg:rounded-[2.5rem] flex items-center justify-center mb-8 lg:mb-10 shadow-2xl">
               <Award className="text-white" size={40} />
             </div>
             <h1 className="text-3xl lg:text-5xl font-black text-[#001E3C] mb-4 text-center tracking-tight">Performans Raporu</h1>
             <p className="text-base lg:text-xl text-slate-500 max-w-lg font-medium leading-relaxed text-center mb-8 lg:mb-12">Gayrimenkulünüzün aylık performans analizini görüntülemek için rapor kodunuzu giriniz.</p>
             
             <form onSubmit={handleClientAccess} className="w-full max-w-md space-y-4">
               <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input type="text" placeholder="Rapor Kodu (Örn: west-101)" value={clientCodeInput} onChange={(e) => setClientCodeInput(e.target.value)}
                    className={`w-full pl-12 pr-6 py-5 lg:py-6 bg-white border-2 ${clientError ? 'border-red-500 animate-shake' : 'border-slate-100'} rounded-2xl lg:rounded-[2rem] outline-none text-lg lg:text-xl font-black text-[#001E3C] shadow-lg focus:border-[#001E3C] transition-all`}
                  />
                  {clientError && <p className="absolute -bottom-6 left-5 text-red-500 text-[10px] font-black uppercase">Geçersiz Kod</p>}
               </div>
               <button type="submit" className="w-full py-5 lg:py-6 bg-[#001E3C] text-white rounded-2xl lg:rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl flex items-center justify-center gap-2">
                 Analizi Görüntüle <ChevronRight size={20}/>
               </button>
             </form>

             <button onClick={() => setShowLoginModal(true)} className="mt-12 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-[#001E3C] transition-colors">Yönetici Girişi</button>
          </div>
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl p-8 lg:p-12 text-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#001E3C] rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-xl"><Lock className="text-white" size={28} /></div>
              <h3 className="text-xl lg:text-2xl font-black text-[#001E3C] mb-2">Sistem Girişi</h3>
              <p className="text-xs lg:text-sm text-slate-400 font-medium mb-8">Lütfen yönetici şifrenizi girin.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" autoFocus placeholder="••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full p-4 bg-slate-50 border-2 ${loginError ? 'border-red-500 animate-pulse' : 'border-slate-100'} rounded-2xl outline-none text-center text-xl font-black tracking-[0.5em] text-[#001E3C]`}
                />
                <button type="submit" className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl">Giriş Yap</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mt-4 uppercase">Kapat</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {(isAdminAuthenticated || isClientMode) && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           {isClientMode ? (
             <MobileNavItem icon={<LayoutDashboard size={20}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
           ) : (
             <>
               <MobileNavItem icon={<Home size={20}/>} active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
               {selectedPropertyId && (
                 <>
                   <MobileNavItem icon={<Edit3 size={20}/>} active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
                   <MobileNavItem icon={<Sparkles size={20}/>} active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                   <MobileNavItem icon={<Eye size={20}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                 </>
               )}
             </>
           )}
        </nav>
      )}

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

// UI Components
const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black shadow-xl border border-white/10' : 'text-white/30 hover:bg-white/5 hover:text-white font-medium'}`}>
    {icon} <span className="text-[13px]">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-[#001E3C] text-white' : 'text-slate-300'}`}>
    {icon}
  </button>
);

const StatCard = ({ label, value, change, icon, color }: any) => {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  const isPositive = change ? parseFloat(change) >= 0 : true;
  return (
    <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col space-y-2 lg:space-y-3 relative overflow-hidden group">
       <div className="flex justify-between items-start">
          <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
          {change && (
            <div className={`flex items-center gap-0.5 text-[8px] lg:text-[10px] font-black px-1.5 py-0.5 rounded-lg ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
               %{Math.abs(parseFloat(change))}
            </div>
          )}
       </div>
       <div>
          <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-lg lg:text-2xl font-black text-[#001E3C]">{value.toLocaleString()}</h4>
       </div>
    </div>
  );
};

const MarketCard = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between p-3 lg:p-4 bg-white/5 rounded-xl lg:border lg:border-white/10">
     <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg text-emerald-400">{icon}</div>
        <span className="text-[10px] lg:text-xs font-medium text-white/70">{label}</span>
     </div>
     <span className="text-xs lg:text-sm font-black text-white">{value}</span>
  </div>
);

const ScoreMeter = ({ label, score }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
       <span className="text-[9px] lg:text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       <span className="text-xs lg:text-base font-black text-[#001E3C]">{score}/5.0</span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
       <div className="h-full bg-[#001E3C] rounded-full transition-all duration-1000" style={{ width: `${(score/5)*100}%` }} />
    </div>
  </div>
);

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#001E3C] outline-none focus:border-[#001E3C]" />
  </div>
);

export default App;
