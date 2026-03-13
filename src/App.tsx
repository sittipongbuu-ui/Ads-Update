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
  metaLeads: 0, // ผลลัพธ์จาก Meta Directly
  formLeads: 0, // ผลลัพธ์จาก Instant Form
};

// ฟังก์ชัน Retry พร้อม Exponential Backoff ตามข้อกำหนด
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
  const [inputs, setInputs] = useState<any>({ ...defaultInputs, campaignName: 'แคมเปญทดสอบ', projectName: 'โครงการ 1' });
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
        if (parsed.length > 0) {
          setProjects(parsed);
          setSelectedProject(parsed[0]);
        }
      } catch (e) {}
    }
    if (savedData) {
      try { 
        const parsedData = JSON.parse(savedData);
        setSavedCampaigns(parsedData); 
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
    if (!apiKey) throw new Error("กรุณาระบุ API Key ในส่วนการตั้งค่าก่อน");
    
    // อัปเดต Model Name ให้ตรงตามที่ระบบระบุ
    const modelName = "gemini-2.5-flash-preview-09-2025";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const base64Data = imageBase64.split(',')[1];

    const prompt = `ในฐานะผู้เชี่ยวชาญการตลาดอสังหาฯ วิเคราะห์ภาพ Ads นี้แบบ Shortcut กระชับ ทรงพลัง ตามฟอร์แมต:
✅ สิ่งที่ดีแล้ว: [บอกจุดเด่นสั้นๆ]
❌ สิ่งที่ยังขาด: [บอกจุดอ่อนสั้นๆ]
💡 จุดที่ต้องแก้ด่วน: [บอกวิธีปรับกราฟิกหรือพาดหัวเพื่อเพิ่มยอดคลิก]`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }]
    };

    const result = await fetchWithBackoff(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error("AI ไม่สามารถสร้างคำตอบได้");
    
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
    const locText = data.targetLocation || 'พื้นที่เป้าหมาย';
    
    let topAdvice = [cpmStatus === 'bad' ? `CPM แพง: กลุ่มเป้าหมายใน "${locText}" มีการแข่งขันสูงหรือตั้งค่าแคบไป` : "ต้นทุนการเข้าถึงกลุ่มเป้าหมายเหมาะสมดี"];
    let midAdvice = [ctrStatus === 'bad' ? "CTR ต่ำ: งานภาพยังไม่หยุดนิ้วคนดู แนะนำให้เปลี่ยนรูปหน้าปก" : "งานภาพดึงดูดสายตาคนได้ดี"];
    
    if (data.adImageAnalysis) {
      const weakness = data.adImageAnalysis.match(/❌\s*สิ่งที่ยังขาด:\s*([^\n]+)/);
      if (weakness) midAdvice.push(`AI: ${weakness[1].trim()}`);
    }

    let botAdvice = [cpaStatus === 'bad' ? "CPA สูง: ต้นทุนรายชื่อแพงเกินมาตรฐาน ควรตรวจสอบความสอดคล้องของราคาบ้านและโปรโมชั่น" : "ประสิทธิภาพการหาลูกค้าอยู่ในเกณฑ์ดีมาก"];
    if (data.metaLeads > data.formLeads * 2) botAdvice.push("สังเกต: รายชื่อส่วนใหญ่มาจาก Meta (แชท) ควรให้ทีมแอดมินรีบตอบเพื่อคัดกรอง");
    
    let overallVerdict = cpaStatus === 'bad' ? "แคมเปญนี้มีประสิทธิภาพต่ำกว่าเกณฑ์ ต้องปรับปรุงด่วน" : "แคมเปญทำงานได้ดีเยี่ยม ควรรักษาระดับนี้ไว้";

    return { 
      metrics: calculatedMetrics, 
      analysis: { topFunnel: topAdvice, midFunnel: midAdvice, botFunnel: botAdvice, overall: overallVerdict, hasIssue: cpaStatus === 'bad' || ctrStatus === 'bad' } 
    };
  };

  const handleAnalyze = (data = inputs) => {
    const res = calculateResults(data);
    if (res) { setMetrics(res.metrics); setAnalysis(res.analysis); }
    else { alert("กรุณากรอกข้อมูล Spend, Impressions และ ผลลัพธ์ อย่างน้อย 1 รายการ"); }
  };

  const handleSave = async () => {
    if (!inputs.campaignName.trim()) { alert("กรุณาตั้งชื่อแคมเปญ"); return; }
    if (!inputs.spend || !inputs.impressions) { alert("กรุณากรอกข้อมูล Spend และ Impressions"); return; }

    let aiText = inputs.adImageAnalysis;
    setImageAnalysisError(null);

    if (inputs.adImage && !aiText && apiKey) {
      setIsAnalyzingImage(true);
      try { 
        aiText = await getAIImageAnalysis(inputs.adImage as string); 
      } catch (e: any) {
        console.error("AI Error:", e);
        setImageAnalysisError(`AI ล้มเหลว: ${e.message}`);
      }
      setIsAnalyzingImage(false);
    }

    const updated = { ...inputs, adImageAnalysis: aiText, projectName: selectedProject };
    const res = calculateResults(updated);
    
    if (res) {
      const newId = activeId || Date.now().toString();
      const newCampaign = { 
        id: newId, 
        date: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
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
      const n = prompt("ชื่อโครงการใหม่:");
      if (n && n.trim()) { 
        const trimmed = n.trim();
        setProjects(p => [...p, trimmed]); 
        setSelectedProject(trimmed); 
        handleNewCampaign(trimmed); 
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
    if (confirm("คุณต้องการลบแคมเปญนี้ใช่หรือไม่?")) {
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real Estate Marketing Tool</p>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="ml-2 p-2 bg-slate-100 rounded-full hover:bg-blue-50 transition-colors group">
              <Settings className={`w-5 h-5 transition-transform group-hover:rotate-45 ${apiKey ? 'text-blue-600' : 'text-slate-400'}`}/>
            </button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2 hover:bg-white transition-colors cursor-pointer">
              <Building className="w-4 h-4 text-blue-600 mr-2"/>
              <select value={selectedProject} onChange={handleProjectChange} className="bg-transparent text-slate-700 font-bold text-sm focus:outline-none cursor-pointer">
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="NEW">+ เพิ่มโครงการใหม่...</option>
              </select>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setViewMode('analyze')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'analyze' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>วิเคราะห์</button>
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
                <p className="text-xs text-slate-500">ใส่รหัส Gemini API เพื่อเปิดใช้งานระบบวิเคราะห์รูปภาพอัตโนมัติ</p>
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
              <button onClick={() => setShowSettings(false)} className="bg-blue-600 text-white px-8 rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">บันทึก</button>
            </div>
          </div>
        )}

        {viewMode === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form Column */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Campaign History</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign Name</label>
                  <input type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} placeholder="ชื่อแคมเปญ" className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-bold bg-blue-50/30 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-200"/>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Start</label>
                    <input type="date" name="startDate" value={inputs.startDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-[10px] font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">End</label>
                    <input type="date" name="endDate" value={inputs.endDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-[10px] font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-blue-600 uppercase px-1 underline">Update Date</label>
                    <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full p-2.5 border border-blue-200 rounded-xl text-[10px] font-bold bg-blue-50/50"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ads Results (ผลลัพธ์)</label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Meta (แชท)</p>
                        <input type="number" name="metaLeads" value={inputs.metaLeads} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-700"/>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-blue-600 uppercase">Form (แบบฟอร์ม)</p>
                        <input type="number" name="formLeads" value={inputs.formLeads} onChange={handleChange} className="w-full p-2.5 border border-blue-200 rounded-xl text-sm font-black text-blue-700"/>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Spend (บาท)</label>
                    <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Impressions</label>
                    <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Reach</label>
                    <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Link Clicks</label>
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
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Upload Ad Creative</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase">AI will analyze upon save</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => handleAnalyze()} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all text-[11px] uppercase tracking-wider border border-slate-200">Test Preview</button>
                <button 
                  onClick={handleSave} 
                  disabled={isAnalyzingImage} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex justify-center items-center gap-2 transition-all disabled:opacity-70 text-[11px] uppercase tracking-wider active:scale-95"
                >
                  {isAnalyzingImage ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 
                  {isAnalyzingImage ? 'AI Analyzing...' : (activeId ? 'Update & Save' : 'Save Campaign')}
                </button>
              </div>

              {activeId && (
                <button onClick={(e) => handleDeleteCampaign(activeId, e)} className="w-full text-[9px] text-rose-400 hover:text-rose-600 flex justify-center items-center gap-1 py-1 font-black uppercase tracking-[0.2em] transition-colors">
                  <Trash2 className="w-3 h-3"/> Delete Record
                </button>
              )}
            </div>

            {/* Results Display Column */}
            <div className="lg:col-span-2 space-y-6">
              {metrics && analysis ? (
                <>
                  {/* Verdict Banner */}
                  <div className={`p-6 rounded-[2rem] border-2 flex items-start gap-5 shadow-lg animate-in zoom-in duration-500 ${analysis.hasIssue ? 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100/50' : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50'}`}>
                    <div className={`p-3 rounded-2xl ${analysis.hasIssue ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                      {analysis.hasIssue ? <AlertTriangle className="w-6 h-6 text-rose-600"/> : <CheckCircle className="w-6 h-6 text-emerald-600"/>}
                    </div>
                    <div>
                      <h3 className="font-black text-xl leading-none mb-2 uppercase italic tracking-tight">Campaign Verdict</h3>
                      <p className="text-sm font-bold opacity-75 leading-relaxed">{analysis.overall}</p>
                    </div>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'CPA (ต้นทุน)', value: `฿${formatMoney(metrics.cpa)}`, status: metrics.cpaStatus, icon: <MessageCircle className="w-3 h-3"/>, sub: inputs.objective === 'chat' ? 'Per Chat' : 'Per Lead' },
                      { label: 'CTR (ความสนใจ)', value: `${formatDecimal(metrics.ctr)}%`, status: metrics.ctrStatus, icon: <MousePointerClick className="w-3 h-3"/>, sub: 'Click Rate' },
                      { label: 'Frequency', value: formatDecimal(metrics.frequency), status: metrics.freqStatus, icon: <Eye className="w-3 h-3"/>, sub: 'Ad Repeat' },
                      { label: 'CPM (การแข่งขัน)', value: `฿${formatMoney(metrics.cpm)}`, status: metrics.cpmStatus, icon: <Users className="w-3 h-3"/>, sub: 'Per 1K View' }
                    ].map((item, idx) => (
                      <div key={idx} className={`p-6 rounded-3xl border-2 shadow-sm transition-all hover:scale-[1.03] flex flex-col items-center group ${getStatusColor(item.status)}`}>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">
                          {item.icon} {item.label}
                        </div>
                        <p className="text-3xl font-black italic tracking-tighter mb-0.5">{item.value}</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Deep Analysis Card */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 -z-10 opacity-40"></div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                      <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800 italic uppercase tracking-tighter">
                        <Info className="text-blue-500 w-7 h-7"/> Deep Analysis
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Results</p>
                          <p className="text-xl font-black text-blue-600 leading-none mt-1">{formatMoney(metrics.totalResults)} <span className="text-[10px] font-bold">Leads</span></p>
                        </div>
                        <div className="h-8 w-px bg-slate-100 mx-2"></div>
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                          {inputs.adImage ? <img src={inputs.adImage as string} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon className="w-6 h-6"/></div>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 font-black text-indigo-600 text-[11px] uppercase tracking-[0.2em] italic bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
                          <BarChart2 className="w-3.5 h-3.5"/> Data Insights
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 pl-4 border-l-4 border-indigo-100">
                          {analysis.botFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-indigo-300"/> {t}</p>)}
                          {analysis.topFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-indigo-300"/> {t}</p>)}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-center gap-2 font-black text-blue-600 text-[11px] uppercase tracking-[0.2em] italic bg-blue-50 px-3 py-1.5 rounded-full w-fit">
                          <ImageIcon className="w-3.5 h-3.5"/> Creative Feedback
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 pl-4 border-l-4 border-blue-100">
                          {analysis.midFunnel.map((t:any, i:any) => <p key={i} className="font-bold leading-relaxed flex gap-2"><ChevronRight className="w-4 h-4 shrink-0 text-blue-300"/> {t}</p>)}
                        </div>
                      </div>
                    </div>

                    {/* AI Feedback Section */}
                    {inputs.adImageAnalysis ? (
                      <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                        <h4 className="font-black text-blue-400 flex items-center gap-2 mb-6 text-xs uppercase tracking-[0.3em] italic">
                          <Sparkles className="w-5 h-5 animate-pulse"/> AI Visual Review
                        </h4>
                        <div className="text-sm text-blue-50/90 leading-loose whitespace-pre-wrap font-bold relative z-10 pl-6 border-l border-blue-500/30 italic">
                          {inputs.adImageAnalysis}
                        </div>
                      </div>
                    ) : (
                      imageAnalysisError ? (
                        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 mt-6 flex items-center gap-4 text-rose-800 text-xs font-black uppercase tracking-tight shadow-lg shadow-rose-100">
                          <div className="bg-rose-200 p-2 rounded-lg"><AlertTriangle className="w-5 h-5"/></div>
                          {imageAnalysisError}
                        </div>
                      ) : (
                        inputs.adImage && !isAnalyzingImage && (
                          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mt-6 flex items-center justify-center gap-3 text-slate-400 text-xs font-black italic uppercase tracking-widest opacity-60">
                            <Sparkles className="w-4 h-4 animate-bounce"/> AI will scan your ad on save
                          </div>
                        )
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white p-32 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center opacity-30 group hover:opacity-50 transition-opacity">
                  <Calculator className="w-24 h-24 text-slate-300 mb-8 group-hover:scale-110 transition-transform duration-500"/>
                  <h3 className="text-2xl font-black text-slate-400 uppercase tracking-[0.3em] italic">Ready for Input</h3>
                  <p className="text-sm font-bold text-slate-300 mt-4 max-w-xs">กรอกข้อมูลสถิติจากหลังบ้าน Facebook เพื่อเริ่มการวิเคราะห์เชิงลึก</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Comparison Dashboard */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700"><BarChart2 className="w-48 h-48"/></div>
                  <h3 className="text-blue-400 font-black text-xs mb-1 uppercase tracking-[0.3em] italic">Total Portfolio Spend</h3>
                  <div className="text-5xl font-black italic tracking-tighter group-hover:text-blue-400 transition-colors">฿{formatMoney(activeCampaigns.reduce((sum, c) => sum + (c.inputs.spend || 0), 0))}</div>
                  <div className="text-slate-500 text-[10px] mt-4 font-black uppercase tracking-widest flex items-center gap-2">
                    <Building className="w-3 h-3"/> {selectedProject} | {activeCampaigns.length} CAMPAIGNS
                  </div>
                </div>
                
                {[
                  { label: 'CPA CHAMPION 🏆', icon: <Trophy className="text-amber-500"/>, color: 'text-emerald-600', valFunc: (arr: any[]) => `฿${formatMoney(arr.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).metrics.cpa)}`, nameFunc: (arr: any[]) => arr.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).inputs.campaignName },
                  { label: 'CTR CHAMPION 👁️', icon: <Eye className="text-purple-500"/>, color: 'text-purple-600', valFunc: (arr: any[]) => `${formatDecimal(arr.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).metrics.ctr)}%`, nameFunc: (arr: any[]) => arr.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).inputs.campaignName }
                ].map((champ, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-xl transition-all group">
                     <h3 className="text-slate-400 font-black text-[10px] mb-4 uppercase tracking-[0.3em] italic flex items-center gap-2">{champ.icon} {champ.label}</h3>
                     {activeCampaigns.length > 0 ? (
                        <div className="space-y-1">
                           <p className="text-base font-black text-slate-800 truncate px-4 group-hover:text-blue-600 transition-colors">{champ.nameFunc(activeCampaigns)}</p>
                           <p className={`text-4xl font-black italic tracking-tighter ${champ.color}`}>{champ.valFunc(activeCampaigns)}</p>
                        </div>
                     ) : <p className="text-slate-300 italic py-4 text-sm font-bold uppercase tracking-widest">No Data</p>}
                  </div>
                ))}
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
               <div className="bg-slate-50/80 border-b border-slate-100 p-8 flex justify-between items-center">
                 <h2 className="font-black text-xl text-slate-800 italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200"><Trophy className="w-5 h-5 text-white"/></div>
                   Campaign Leaderboard
                 </h2>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                     <tr>
                       <th className="p-8">Visual</th>
                       <th className="p-8">Campaign Details</th>
                       <th className="p-8 text-right">Ad Spend</th>
                       <th className="p-8 text-right">Results</th>
                       <th className="p-8 text-right text-blue-600">CPA (Cost)</th>
                       <th className="p-8 text-right">CTR (%)</th>
                       <th className="p-8 text-center">Manage</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {activeCampaigns.map(c => (
                       <tr key={c.id} className="hover:bg-blue-50/40 transition-all group">
                         <td className="p-8">
                           <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                             {c.inputs.adImage ? <img src={c.inputs.adImage as string} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon className="w-6 h-6"/></div>}
                           </div>
                         </td>
                         <td className="p-8">
                           <p className="font-black text-slate-800 text-lg leading-none mb-2 uppercase italic tracking-tight">{c.inputs.campaignName}</p>
                           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-500"/> Update {formatDate(c.inputs.dataAsOfDate)}</p>
                         </td>
                         <td className="p-8 text-right font-black text-slate-600 tracking-tighter text-base">฿{formatMoney(c.inputs.spend)}</td>
                         <td className="p-8 text-right">
                            <p className="font-black text-slate-800 text-lg tracking-tighter leading-none">{formatMoney(c.metrics.totalResults)}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Leads Collected</p>
                         </td>
                         <td className={`p-8 text-right bg-blue-50/30 group-hover:bg-blue-100/50 transition-colors`}>
                            <p className={`font-black italic tracking-tighter text-xl ${getStatusColor(c.metrics.cpaStatus).split(' ')[2]}`}>฿{formatMoney(c.metrics.cpa)}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Efficiency Rate</p>
                         </td>
                         <td className="p-8 text-right font-black text-slate-800 tracking-tighter text-lg italic">{formatDecimal(c.metrics.ctr)}%</td>
                         <td className="p-8">
                           <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                             <button onClick={() => handleLoadCampaign(c)} className="p-3.5 text-blue-600 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white transition-all active:scale-90" title="Edit Data"><Eye className="w-5 h-5"/></button>
                             <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-3.5 text-rose-400 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-90" title="Delete"><Trash2 className="w-5 h-5"/></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {activeCampaigns.length === 0 && (
                    <div className="p-32 text-center flex flex-col items-center">
                       <Calculator className="w-20 h-20 text-slate-200 mb-6"/>
                       <p className="text-slate-400 font-black uppercase tracking-[0.3em] italic">No Campaign Leaderboard</p>
                    </div>
                 )}
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
