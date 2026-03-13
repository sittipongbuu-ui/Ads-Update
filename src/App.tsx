import React, { useState, useEffect } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, Info, 
  Eye, MousePointerClick, MessageCircle,
  Image as ImageIcon, MapPin, Users, UploadCloud,
  Save, Plus, Trash2, History, Sparkles, Loader2,
  Trophy, LayoutDashboard, BarChart2, Calendar, Clock, Building, Settings, Key,
  ChevronRight
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

const defaultInputs = {
  campaignName: '',
  projectName: 'โครงการ 1',
  startDate: today,
  endDate: today,
  dataAsOfDate: today,
  objective: 'chat',
  targetLocation: 'รัศมี 10 กม. รอบโครงการ',
  targetAge: '25-45',
  targetDemographics: 'พนักงานบริษัท, สมรส',
  targetInterests: 'สินเชื่อบ้าน, อสังหาริมทรัพย์',
  targetBehaviors: 'ผู้ที่เพิ่งย้ายที่อยู่',
  adImage: null,
  adImageAnalysis: '',
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  metaLeads: 0, 
  formLeads: 0, 
};

// ฟังก์ชัน Retry พร้อม Exponential Backoff
const fetchWithBackoff = async (url: string, options: any, retries = 5) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const App = () => {
  const [viewMode, setViewMode] = useState<'analyze' | 'compare'>('analyze');
  const [projects, setProjects] = useState(['โครงการ 1', 'โครงการ 2']);
  const [selectedProject, setSelectedProject] = useState('โครงการ 1');
  const [inputs, setInputs] = useState<any>({ ...defaultInputs, campaignName: 'แคมเปญใหม่', projectName: 'โครงการ 1' });
  const [metrics, setMetrics] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('AIzaSyCaTmci5JIUwfEBdTNKIa7ZUqSsDIK_YZ4'); 
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('realEstateCampaigns');
    const savedProjects = localStorage.getItem('realEstateProjects');
    const savedKey = localStorage.getItem('gemini_api_key');
    
    if (savedKey) setApiKey(savedKey);
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        if (parsed.length > 0) setProjects(parsed);
      } catch (e) {}
    }
    if (savedData) {
      try { 
        setSavedCampaigns(JSON.parse(savedData)); 
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('realEstateCampaigns', JSON.stringify(savedCampaigns));
      localStorage.setItem('realEstateProjects', JSON.stringify(projects));
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [savedCampaigns, projects, isLoaded, apiKey]);

  const activeCampaigns = savedCampaigns.filter(c => c.inputs.projectName === selectedProject);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setInputs((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputs((prev: any) => ({ 
          ...prev, 
          [fieldName]: reader.result,
          adImageAnalysis: '' 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getAIImageAnalysis = async (imageBase64: string) => {
    if (!apiKey) throw new Error("กรุณาระบุ API Key ก่อน");
    
    // เปลี่ยนจาก v1beta เป็น v1 และระบุโมเดลที่ถูกต้อง
    const modelName = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const base64Data = imageBase64.split(',')[1];

    const prompt = `คุณคือผู้เชี่ยวชาญการตลาดอสังหาริมทรัพย์ระดับโลก วิเคราะห์ภาพโฆษณานี้และให้คำแนะนำที่ทรงพลังตามฟอร์แมต:
✅ สิ่งที่ดีแล้ว: [จุดเด่นสั้นๆ 1-2 ข้อ]
❌ สิ่งที่ยังขาด: [จุดอ่อนที่ต้องแก้สั้นๆ 1-2 ข้อ]
💡 จุดที่ต้องแก้ด่วน: [ระบุพาดหัวหรือกราฟิกที่ต้องเปลี่ยนเพื่อให้คนคลิกเพิ่ม]`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      }]
    };

    const result = await fetchWithBackoff(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error("AI ประมวลผลลัพธ์ไม่สำเร็จ");
    
    return textResult;
  };

  const calculateResults = (data: any) => {
    const totalResults = (data.metaLeads || 0) + (data.formLeads || 0);
    if (!data.spend || !data.impressions || totalResults === 0) return null;

    const cpm = (data.spend / data.impressions) * 1000;
    const frequency = data.impressions / (data.reach || 1);
    const ctr = (data.clicks / data.impressions) * 100;
    const cpa = data.spend / totalResults;

    let cpaStatus = cpa > (data.objective === 'chat' ? 400 : 1200) ? 'bad' : (cpa > (data.objective === 'chat' ? 150 : 400) ? 'warning' : 'good');
    let ctrStatus = ctr < 1.0 ? 'bad' : (ctr < 1.5 ? 'warning' : 'good');
    let freqStatus = frequency > 2.5 ? 'bad' : (frequency > 1.5 ? 'warning' : 'good');
    let cpmStatus = cpm > 300 ? 'bad' : (cpm > 150 ? 'warning' : 'good');

    const calculatedMetrics = { cpm, frequency, ctr, cpa, totalResults, cpaStatus, ctrStatus, cpmStatus, freqStatus };
    
    let topAdvice = [cpmStatus === 'bad' ? `CPM แพง: ตลาดแข่งสูงหรือกลุ่มเป้าหมายแคบเกินไป` : "ต้นทุนการเข้าถึงกลุ่มเป้าหมายอยู่ในเกณฑ์ดี"];
    let midAdvice = [ctrStatus === 'bad' ? "CTR ต่ำ: งานภาพยังไม่ดึงดูดพอ ต้องเปลี่ยนภาพหรือพาดหัวใหม่" : "งานภาพทำงานได้ดี ดึงดูดสายตาคนได้"];
    
    if (data.adImageAnalysis) {
      const weakness = data.adImageAnalysis.match(/❌\s*สิ่งที่ยังขาด:\s*([^\n]+)/);
      if (weakness) midAdvice.push(`AI ตรวจพบ: ${weakness[1].trim()}`);
    }

    let botAdvice = [cpaStatus === 'bad' ? "CPA แพง: ต้องพิจารณาโปรโมชั่นหรือราคาบ้านว่าตรงใจกลุ่มเป้าหมายไหม" : "ต้นทุนรายชื่อลูกค้าเหมาะสม"];
    let overallVerdict = cpaStatus === 'bad' ? "แคมเปญประสิทธิภาพต่ำ ต้องปรับปรุงด่วน" : "แคมเปญทำงานได้ดี ควรรักษาระดับนี้ไว้";

    return { 
      metrics: calculatedMetrics, 
      analysis: { topFunnel: topAdvice, midFunnel: midAdvice, botFunnel: botAdvice, overall: overallVerdict, hasIssue: cpaStatus === 'bad' || ctrStatus === 'bad' } 
    };
  };

  const handleAnalyze = (data = inputs) => {
    const res = calculateResults(data);
    if (res) { setMetrics(res.metrics); setAnalysis(res.analysis); }
  };

  const handleSave = async () => {
    if (!inputs.campaignName.trim()) { alert("กรุณาตั้งชื่อแคมเปญ"); return; }
    if (!inputs.spend || !inputs.impressions) { alert("กรุณากรอกตัวเลขงบประมาณและการแสดงผล"); return; }

    let aiText = inputs.adImageAnalysis;
    setImageAnalysisError(null);

    // ถ้ามีรูป และยังไม่มีบทวิเคราะห์ หรือ AI เคยพลาด ให้ลองใหม่
    if (inputs.adImage && !aiText && apiKey) {
      setIsAnalyzingImage(true);
      try { 
        aiText = await getAIImageAnalysis(inputs.adImage as string); 
      } catch (e: any) {
        setImageAnalysisError(`AI ขัดข้อง: ${e.message}`);
      }
      setIsAnalyzingImage(false);
    }

    const updated = { ...inputs, adImageAnalysis: aiText, projectName: selectedProject };
    const res = calculateResults(updated);
    
    if (res) {
      const newId = activeId || Date.now().toString();
      const newCampaign = { 
        id: newId, 
        date: new Date().toLocaleString('th-TH', { dateStyle: 'short' }),
        inputs: updated, 
        metrics: res.metrics, 
        analysis: res.analysis 
      };
      setSavedCampaigns(prev => activeId ? prev.map(c => c.id === activeId ? newCampaign : c) : [newCampaign, ...prev]);
      setActiveId(newId);
      setInputs(updated); 
      setMetrics(res.metrics); 
      setAnalysis(res.analysis);
    }
  };

  const handleNewCampaign = (proj = selectedProject) => {
    setActiveId(null); 
    setInputs({ ...defaultInputs, campaignName: '', projectName: proj });
    setMetrics(null); 
    setAnalysis(null); 
    setViewMode('analyze');
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const n = prompt("กรุณาใส่ชื่อโครงการใหม่:");
      if (n && n.trim()) { 
        setProjects(p => [...p, n.trim()]); 
        setSelectedProject(n.trim()); 
        handleNewCampaign(n.trim()); 
      }
    } else { 
      setSelectedProject(val); 
      handleNewCampaign(val); 
    }
  };

  const handleLoadCampaign = (c: any) => {
    setActiveId(c.id); 
    setInputs(c.inputs); 
    setMetrics(c.metrics); 
    setAnalysis(c.analysis); 
    setViewMode('analyze');
  };

  const handleDeleteCampaign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("ต้องการลบข้อมูลแคมเปญนี้ใช่หรือไม่?")) {
      setSavedCampaigns(p => p.filter(c => c.id !== id));
      if (activeId === id) handleNewCampaign();
    }
  };

  const formatMoney = (num: number) => Math.round(num || 0).toLocaleString('th-TH');
  const formatDecimal = (num: number) => (num || 0).toFixed(2);
  const formatDate = (s: string) => s ? s.split('-').reverse().join('/') : '-';
  
  const getStatusColor = (status: string) => {
    if (status === 'good') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (status === 'warning') return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-rose-50 border-rose-200 text-rose-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <Calculator className="text-white w-6 h-6"/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Ads Analyzer <span className="text-blue-600">Pro</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real Estate Marketing Hub</p>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="ml-2 p-2 bg-slate-100 rounded-full hover:bg-blue-50 transition-colors group">
              <Settings className={`w-5 h-5 transition-transform group-hover:rotate-45 ${apiKey ? 'text-blue-600' : 'text-slate-400'}`}/>
            </button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2 hover:bg-white transition-colors">
              <Building className="w-4 h-4 text-blue-600 mr-2"/>
              <select value={selectedProject} onChange={handleProjectChange} className="bg-transparent text-slate-700 font-bold text-sm focus:outline-none cursor-pointer">
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="NEW">+ เพิ่มโครงการใหม่...</option>
              </select>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setViewMode('analyze')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'analyze' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>กรอกข้อมูล</button>
              <button onClick={() => setViewMode('compare')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'compare' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>เปรียบเทียบ</button>
            </div>
          </div>
        </div>

        {/* API Key Settings */}
        {showSettings && (
          <div className="bg-white border-2 border-blue-100 p-6 rounded-3xl shadow-xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-xl"><Key className="text-blue-600 w-5 h-5"/></div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight italic">AI Configuration</h3>
                <p className="text-xs text-slate-500">กรุณาใส่ API Key ของ Google Gemini เพื่อใช้งานการวิเคราะห์ภาพ</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="วาง API Key ที่นี่..." 
                className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button onClick={() => setShowSettings(false)} className="bg-blue-600 text-white px-8 rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">บันทึก</button>
            </div>
          </div>
        )}

        {viewMode === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Column */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign History</label>
                <select 
                  value={activeId || 'NEW'} 
                  onChange={(e) => e.target.value === 'NEW' ? handleNewCampaign() : handleLoadCampaign(activeCampaigns.find(c => c.id === e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  <option value="NEW">✨ + สร้างแคมเปญใหม่</option>
                  {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.inputs.campaignName} ({formatDate(c.inputs.dataAsOfDate)})</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign Details</label>
                  <input type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} placeholder="ชื่อแคมเปญ" className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-bold bg-blue-50/30 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-200"/>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Update Date</p>
                       <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"/>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Objective</p>
                       <select name="objective" value={inputs.objective} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                          <option value="chat">Messenger</option>
                          <option value="form">Instant Form</option>
                       </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Performance Results</label>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Meta Leads</p>
                      <input type="number" name="metaLeads" value={inputs.metaLeads} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-700"/>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-blue-600 uppercase">Form Leads</p>
                      <input type="number" name="formLeads" value={inputs.formLeads} onChange={handleChange} className="w-full p-2.5 border border-blue-200 rounded-xl text-sm font-black text-blue-700"/>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Spend (THB)</p>
                    <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Impressions</p>
                    <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Reach</p>
                    <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Link Clicks</p>
                    <input type="number" name="clicks" value={inputs.clicks} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 p-6 rounded-3xl text-center relative cursor-pointer hover:bg-slate-50 transition-all bg-slate-50/50 group">
                <input type="file" onChange={(e) => handleImageUpload(e, 'adImage')} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                {inputs.adImage ? (
                  <img src={inputs.adImage as string} className="max-h-40 mx-auto object-cover rounded-2xl shadow-xl border-4 border-white" />
                ) : (
                  <div className="py-4 space-y-2">
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-sm group-hover:scale-110 transition-transform">
                      <UploadCloud className="text-slate-300 w-8 h-8"/>
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Upload Creative</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase">AI Analysis will start on save</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleSave} 
                  disabled={isAnalyzingImage} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex justify-center items-center gap-2 transition-all disabled:opacity-70 text-[11px] uppercase tracking-widest active:scale-95"
                >
                  {isAnalyzingImage ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 
                  {isAnalyzingImage ? 'AI Analyzing...' : (activeId ? 'Update Record' : 'Save & Analyze')}
                </button>
              </div>

              {activeId && (
                <button onClick={(e) => handleDeleteCampaign(activeId, e)} className="w-full text-[9px] text-rose-400 hover:text-rose-600 flex justify-center items-center gap-1 py-1 font-black uppercase tracking-widest transition-colors">
                  <Trash2 className="w-3 h-3"/> Delete Record
                </button>
              )}
            </div>

            {/* Results Display Column */}
            <div className="lg:col-span-2 space-y-6">
              {metrics && analysis ? (
                <>
                  <div className={`p-6 rounded-[2rem] border-2 flex items-start gap-5 shadow-lg animate-in zoom-in duration-500 ${analysis.hasIssue ? 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100/50' : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50'}`}>
                    <div className={`p-3 rounded-2xl ${analysis.hasIssue ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                      {analysis.hasIssue ? <AlertTriangle className="w-6 h-6 text-rose-600"/> : <CheckCircle className="w-6 h-6 text-emerald-600"/>}
                    </div>
                    <div>
                      <h3 className="font-black text-xl leading-none mb-2 uppercase italic tracking-tight">Campaign Verdict</h3>
                      <p className="text-sm font-bold opacity-75 leading-relaxed">{analysis.overall}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'CPA (ต้นทุน)', value: `฿${formatMoney(metrics.cpa)}`, status: metrics.cpaStatus, sub: 'Per Results' },
                      { label: 'CTR (ความสนใจ)', value: `${formatDecimal(metrics.ctr)}%`, status: metrics.ctrStatus, sub: 'Click-through' },
                      { label: 'Freq (ความถี่)', value: formatDecimal(metrics.frequency), status: metrics.freqStatus, sub: 'Ad Repeat' },
                      { label: 'CPM (การแข่งขัน)', value: `฿${formatMoney(metrics.cpm)}`, status: metrics.cpmStatus, sub: 'Per 1K Views' }
                    ].map((item, idx) => (
                      <div key={idx} className={`p-6 rounded-3xl border-2 shadow-sm flex flex-col items-center ${getStatusColor(item.status)}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">{item.label}</p>
                        <p className="text-3xl font-black italic tracking-tighter mb-0.5">{item.value}</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
                    <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800 italic uppercase tracking-tighter border-b border-slate-50 pb-6">
                      <Info className="text-blue-500 w-7 h-7"/> Deep Analysis
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 font-black text-indigo-600 text-[11px] uppercase tracking-widest italic bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
                          <BarChart2 className="w-3.5 h-3.5"/> Data Insights
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 pl-4 border-l-4 border-indigo-100">
                          {analysis.botFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-indigo-300"/> {t}</p>)}
                          {analysis.topFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-indigo-300"/> {t}</p>)}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-center gap-2 font-black text-blue-600 text-[11px] uppercase tracking-widest italic bg-blue-50 px-3 py-1.5 rounded-full w-fit">
                          <ImageIcon className="w-3.5 h-3.5"/> Creative Feedback
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 pl-4 border-l-4 border-blue-100">
                          {analysis.midFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-blue-300"/> {t}</p>)}
                        </div>
                      </div>
                    </div>

                    {inputs.adImageAnalysis ? (
                      <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <h4 className="font-black text-blue-400 flex items-center gap-2 mb-6 text-xs uppercase tracking-widest italic">
                          <Sparkles className="w-5 h-5 animate-pulse"/> AI Visual Review
                        </h4>
                        <div className="text-sm text-blue-50/90 leading-loose whitespace-pre-wrap font-bold relative z-10 pl-6 border-l border-blue-500/30 italic">
                          {inputs.adImageAnalysis}
                        </div>
                      </div>
                    ) : (
                      imageAnalysisError && (
                        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 mt-6 flex items-center gap-4 text-rose-800 text-[11px] font-black uppercase tracking-tight shadow-md">
                          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0"/> {imageAnalysisError}
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white p-32 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center opacity-30">
                  <Calculator className="w-24 h-24 text-slate-300 mb-8"/>
                  <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest italic">กรอกข้อมูลและกดบันทึกเพื่อดูผลวิเคราะห์</h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Compare Leaderboard */
          <div className="space-y-8 animate-in fade-in duration-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700"><BarChart2 className="w-48 h-48"/></div>
                  <h3 className="text-blue-400 font-black text-xs mb-1 uppercase tracking-widest italic">Total Ad Spend</h3>
                  <div className="text-5xl font-black italic tracking-tighter">฿{formatMoney(activeCampaigns.reduce((sum, c) => sum + (c.inputs.spend || 0), 0))}</div>
                  <div className="text-slate-500 text-[10px] mt-4 font-black uppercase tracking-widest">
                    {selectedProject} | {activeCampaigns.length} Campaigns
                  </div>
                </div>
                
                {activeCampaigns.length > 0 && (
                  <>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-xl transition-all">
                       <h3 className="text-slate-400 font-black text-[10px] mb-4 uppercase tracking-widest italic">CPA Champion 🏆</h3>
                       <p className="text-base font-black text-slate-800 truncate px-4">{activeCampaigns.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).inputs.campaignName}</p>
                       <p className="text-4xl font-black italic tracking-tighter text-emerald-600">฿{formatMoney(activeCampaigns.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).metrics.cpa)}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-xl transition-all">
                       <h3 className="text-slate-400 font-black text-[10px] mb-4 uppercase tracking-widest italic">CTR Champion 👁️</h3>
                       <p className="text-base font-black text-slate-800 truncate px-4">{activeCampaigns.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).inputs.campaignName}</p>
                       <p className="text-4xl font-black italic tracking-tighter text-purple-600">{formatDecimal(activeCampaigns.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).metrics.ctr)}%</p>
                    </div>
                  </>
                )}
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
               <div className="bg-slate-50/80 border-b border-slate-100 p-8">
                 <h2 className="font-black text-xl text-slate-800 italic uppercase tracking-tighter flex items-center gap-3">
                   <Trophy className="w-6 h-6 text-amber-500"/> Campaign Leaderboard
                 </h2>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                     <tr>
                       <th className="p-8">Ad Creative</th>
                       <th className="p-8">Campaign Details</th>
                       <th className="p-8 text-right">Spend</th>
                       <th className="p-8 text-right text-blue-600">CPA</th>
                       <th className="p-8 text-right">CTR</th>
                       <th className="p-8 text-center">Manage</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {activeCampaigns.map(c => (
                       <tr key={c.id} className="hover:bg-blue-50/40 transition-all group">
                         <td className="p-8">
                           <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-lg group-hover:scale-110 transition-transform">
                             {c.inputs.adImage ? <img src={c.inputs.adImage as string} className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 text-slate-300 m-7"/>}
                           </div>
                         </td>
                         <td className="p-8">
                           <p className="font-black text-slate-800 text-lg uppercase italic">{c.inputs.campaignName}</p>
                           <p className="text-[10px] text-slate-400 font-black uppercase">Update {formatDate(c.inputs.dataAsOfDate)}</p>
                         </td>
                         <td className="p-8 text-right font-black text-slate-600">฿{formatMoney(c.inputs.spend)}</td>
                         <td className={`p-8 text-right font-black italic text-xl ${getStatusColor(c.metrics.cpaStatus).split(' ')[2]}`}>฿{formatMoney(c.metrics.cpa)}</td>
                         <td className="p-8 text-right font-black text-slate-800 italic">{formatDecimal(c.metrics.ctr)}%</td>
                         <td className="p-8">
                           <div className="flex justify-center gap-3">
                             <button onClick={() => handleLoadCampaign(c)} className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Eye className="w-5 h-5"/></button>
                             <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-3 text-rose-400 bg-rose-50 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-5 h-5"/></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
