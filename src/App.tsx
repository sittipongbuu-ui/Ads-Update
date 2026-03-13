import React, { useState, useEffect } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, Info, 
  Eye, MousePointerClick, MessageCircle,
  Image as ImageIcon, MapPin, Users, UploadCloud,
  Save, Plus, Trash2, History, Sparkles, Loader2,
  Trophy, LayoutDashboard, BarChart2, ArrowRight, Calendar, Clock, Building
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0]; // หาวันที่ปัจจุบัน (YYYY-MM-DD)

const defaultInputs = {
  campaignName: '',
  projectName: 'โครงการ 1', // เพิ่มฟิลด์สำหรับระบุโครงการ
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
  spend: 5000,
  impressions: 25000,
  reach: 12000,
  clicks: 300,
  results: 15
};

const fetchWithBackoff = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

const App = () => {
  // Navigation & Project State
  const [viewMode, setViewMode] = useState('analyze'); // 'analyze' | 'compare'
  const [projects, setProjects] = useState(['โครงการ 1', 'โครงการ 2']);
  const [selectedProject, setSelectedProject] = useState('โครงการ 1');

  // Forms & Single Analysis State
  const [inputs, setInputs] = useState({ ...defaultInputs, campaignName: 'แคมเปญทดสอบ (Demo)', projectName: 'โครงการ 1' });
  const [metrics, setMetrics] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Storage State
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [activeId, setActiveId] = useState(null); 
  const [isLoaded, setIsLoaded] = useState(false);

  // AI State
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem('realEstateCampaigns');
    const savedProjects = localStorage.getItem('realEstateProjects');
    
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        if (parsedProjects && parsedProjects.length > 0) {
          setProjects(parsedProjects);
          setSelectedProject(parsedProjects[0]);
          setInputs(prev => ({ ...prev, projectName: parsedProjects[0] }));
        }
      } catch (e) {
        console.error("Error loading projects", e);
      }
    }

    if (savedData) {
      try {
        setSavedCampaigns(JSON.parse(savedData));
      } catch (e) {
        console.error("Error loading saved campaigns", e);
      }
    }
    setIsLoaded(true);
    handleAnalyze({ ...defaultInputs, campaignName: 'แคมเปญทดสอบ (Demo)' });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('realEstateCampaigns', JSON.stringify(savedCampaigns));
      localStorage.setItem('realEstateProjects', JSON.stringify(projects));
    }
  }, [savedCampaigns, projects, isLoaded]);

  // คัดกรองแคมเปญให้แสดงเฉพาะโครงการที่กำลังเลือก
  const activeCampaigns = savedCampaigns.filter(c => c.inputs.projectName === selectedProject);

  const textFields = ['objective', 'campaignName', 'targetLocation', 'targetAge', 'targetDemographics', 'targetInterests', 'targetBehaviors', 'startDate', 'endDate', 'dataAsOfDate', 'projectName'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: textFields.includes(name) ? value : Number(value)
    }));
  };

  const handleImageUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setInputs(prev => ({ 
          ...prev, 
          [fieldName]: base64String,
          ...(fieldName === 'adImage' ? { adImageAnalysis: '' } : {}) // ล้างค่า AI เดิมทิ้งเมื่อเปลี่ยนรูป
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ดึงฟังก์ชันเรียก API ออกมาเป็น Helper สำหรับใช้ตอนกดเซฟ
  const getAIImageAnalysis = async (imageBase64) => {
    const apiKey = "AIzaSyA3cGpZCpVOtR2ry-0RPp-QblytHX2deno"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const base64String = imageBase64.split(',')[1];

    const prompt = `วิเคราะห์ภาพโฆษณาอสังหาฯ นี้แบบสรุปสั้นๆ (Shortcut) กระชับ ตรงประเด็น ทรงพลัง ไม่ต้องเกริ่นนำ ให้ตอบตามรูปแบบฟอร์แมตนี้เท่านั้น:
✅ สิ่งที่ดีแล้ว: [บอกจุดเด่นสั้นๆ]
❌ สิ่งที่ยังขาด: [บอกจุดอ่อน หรือสิ่งที่ดูยาก สั้นๆ]
💡 จุดที่ต้องแก้ด่วน: [บอกวิธีปรับกราฟิกหรือพาดหัวสั้นๆ เพื่อเพิ่มยอดคลิก]`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64String } }] }]
    };

    const result = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return result.candidates?.[0]?.content?.parts?.[0]?.text;
  };

  const calculateResults = (data) => {
    if (!data.spend || !data.impressions || !data.reach || !data.clicks || !data.results) return null;

    const cpm = (data.spend / data.impressions) * 1000;
    const frequency = data.impressions / data.reach;
    const ctr = (data.clicks / data.impressions) * 100;
    const cpc = data.spend / data.clicks;
    const cpa = data.spend / data.results;

    let cpaStatus = 'good';
    if (data.objective === 'chat') { if (cpa > 400) cpaStatus = 'bad'; else if (cpa > 150) cpaStatus = 'warning'; } 
    else { if (cpa > 1200) cpaStatus = 'bad'; else if (cpa > 400) cpaStatus = 'warning'; }

    let ctrStatus = 'good';
    if (ctr < 1.0) ctrStatus = 'bad'; else if (ctr < 1.5) ctrStatus = 'warning';

    let cpcStatus = 'good';
    if (cpc > 40) cpcStatus = 'bad'; else if (cpc > 15) cpcStatus = 'warning';

    let cpmStatus = 'good';
    if (cpm > 300) cpmStatus = 'bad'; else if (cpm > 150) cpmStatus = 'warning';

    let freqStatus = 'good';
    if (frequency > 2.5) freqStatus = 'bad'; else if (frequency > 1.5) freqStatus = 'warning';

    const calculatedMetrics = { cpm, frequency, ctr, cpc, cpa, cpaStatus, ctrStatus, cpcStatus, cpmStatus, freqStatus };

    let topAdvice = [];
    let midAdvice = [];
    let botAdvice = [];
    let overallVerdict = "แคมเปญของคุณทำงานได้ดีเยี่ยม! ควรรักษาระดับนี้ไว้";
    
    const locText = data.targetLocation || 'ที่ตั้งไว้';
    const demoText = [data.targetAge, data.targetDemographics, data.targetInterests].filter(Boolean).join(', ');
    const audienceText = ` "${locText} (${demoText})" `;

    // Top Funnel
    if (freqStatus === 'bad') topAdvice.push(`ความถี่สูงเกินไป: ลูกค้าในกลุ่ม${audienceText}เห็นโฆษณาซ้ำจนเบื่อแล้ว ควรขยายรัศมีด่วน`);
    else if (freqStatus === 'warning') topAdvice.push(`ความถี่เริ่มสูง: เริ่มเข้าถึงคนซ้ำ เตรียมทำคอนเทนต์ใหม่`);
    if (cpmStatus === 'bad') topAdvice.push(`CPM แพงผิดปกติ: กลุ่มเป้าหมาย${audienceText}อาจแคบไป หรือคู่แข่งเยอะ ลองขยายรัศมีเพิ่ม`);
    if (topAdvice.length === 0) topAdvice.push(`การตั้งกลุ่มเป้าหมายและรัศมีเหมาะสมดีมาก`);

    // Middle Funnel
    if (ctrStatus === 'bad') midAdvice.push(`CTR ต่ำ: รูปหรือพาดหัวยังไม่ดึงดูด ต้องเปลี่ยนรูปหน้าปกด่วน`);
    else if (ctrStatus === 'warning') midAdvice.push(`CTR ปานกลาง: คนคลิกเรื่อยๆ ลองทำ A/B Test พาดหัวโปรโมชั่นเพิ่ม`);
    if (cpcStatus === 'bad' && ctrStatus === 'good') midAdvice.push(`คลิกแพง (CPC สูง): ประมูลพื้นที่โฆษณายาก ลองเช็ค Interest คู่แข่ง`);
    if (midAdvice.length === 0) midAdvice.push(`ชิ้นงานโฆษณาดึงดูดสายตาดีเยี่ยม (อิงจากตัวเลข)`);

    // แทรกผลวิเคราะห์จาก AI เข้าไปใน Middle Funnel
    if (data.adImageAnalysis) {
      const weaknessMatch = data.adImageAnalysis.match(/❌\s*สิ่งที่ยังขาด:\s*([^\n]+)/);
      const suggestionMatch = data.adImageAnalysis.match(/💡\s*จุดที่ต้องแก้ด่วน:\s*([^\n]+)/);
      
      if (ctrStatus === 'bad' || ctrStatus === 'warning') {
        if (weaknessMatch && weaknessMatch[1]) midAdvice.push(`AI ตรวจพบปัญหาจากภาพ: ${weaknessMatch[1].trim()}`);
        if (suggestionMatch && suggestionMatch[1]) midAdvice.push(`คำแนะนำกราฟิกจาก AI: ${suggestionMatch[1].trim()}`);
      } else {
        if (suggestionMatch && suggestionMatch[1]) midAdvice.push(`คำแนะนำเพิ่มเติมจาก AI: ${suggestionMatch[1].trim()}`);
      }
    }

    // Bottom Funnel
    if (cpaStatus === 'bad') {
      if (ctrStatus === 'good') botAdvice.push(`คลิกเยอะแต่ไม่ทัก/กรอกฟอร์ม: ปัญหาที่ปลายทาง สินค้า/ราคาอาจไม่ตรงใจกลุ่ม${audienceText}`);
      else botAdvice.push(`คนทักแพงมากเพราะรูปไม่น่าสนใจแต่แรก (CTR ต่ำ) ต้องรื้อทำคอนเทนต์ใหม่`);
      overallVerdict = "แคมเปญนี้มีปัญหาที่ต้องแก้ไขด่วน!";
    } else if (cpaStatus === 'warning') {
      botAdvice.push(`ต้นทุนพอรับได้: ให้เซลส์เช็คว่ารายชื่อที่ได้มากู้ผ่านจริงกี่ % ถ้าคุณภาพดีถือว่าผ่าน`);
      overallVerdict = "แคมเปญอยู่ในระดับน่าพอใจ แต่อาจต้องติดตามผลลัพธ์จากเซลส์ประกอบ";
    } else {
      botAdvice.push(`ยอดเยี่ยม!: ต้นทุนถูกกว่ามาตรฐาน กลุ่ม${audienceText}ตอบสนองดี ถ้าปิดเคสได้ควรอัดงบเพิ่ม`);
    }

    const calculatedAnalysis = { topFunnel: topAdvice, midFunnel: midAdvice, botFunnel: botAdvice, overall: overallVerdict, hasIssue: cpaStatus === 'bad' || ctrStatus === 'bad' || freqStatus === 'bad' };

    return { metrics: calculatedMetrics, analysis: calculatedAnalysis };
  };

  const handleAnalyze = (dataToAnalyze = inputs) => {
    const result = calculateResults(dataToAnalyze);
    if (result) {
      setMetrics(result.metrics);
      setAnalysis(result.analysis);
    } else {
      alert("กรุณากรอกข้อมูลตัวเลขให้ครบถ้วนก่อนวิเคราะห์");
    }
  };

  const handleSave = async () => {
    if (!inputs.campaignName.trim()) { alert("กรุณาตั้งชื่อแคมเปญก่อนบันทึก"); return; }
    
    // ตรวจสอบข้อมูลตัวเลขเบื้องต้นก่อนเรียก AI
    if (!inputs.spend || !inputs.impressions || !inputs.reach || !inputs.clicks || !inputs.results) { 
      alert("กรุณากรอกข้อมูลให้ครบก่อนบันทึก"); return; 
    }

    let currentAnalysisText = inputs.adImageAnalysis;

    // ถ้ามีการอัปโหลดรูป แต่ยังไม่มีผลการวิเคราะห์ ให้ AI วิเคราะห์ก่อนบันทึก
    if (inputs.adImage && !currentAnalysisText) {
      setIsAnalyzingImage(true);
      setImageAnalysisError(null);
      try {
        currentAnalysisText = await getAIImageAnalysis(inputs.adImage);
      } catch (err) {
        console.error(err);
        setImageAnalysisError("ไม่สามารถเชื่อมต่อ AI ได้ในขณะนี้ ข้อมูลตัวเลขจะถูกบันทึกตามปกติ");
      } finally {
        setIsAnalyzingImage(false);
      }
    }

    const updatedInputs = { ...inputs, adImageAnalysis: currentAnalysisText, projectName: selectedProject };
    const result = calculateResults(updatedInputs);

    setInputs(updatedInputs);
    setMetrics(result.metrics);
    setAnalysis(result.analysis);

    const newCampaign = {
      id: activeId || Date.now().toString(),
      date: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      inputs: updatedInputs,
      metrics: result.metrics,
      analysis: result.analysis
    };

    if (activeId) {
      setSavedCampaigns(prev => prev.map(c => c.id === activeId ? newCampaign : c));
    } else {
      setSavedCampaigns(prev => [newCampaign, ...prev]);
      setActiveId(newCampaign.id);
    }
  };

  const handleNewCampaign = (projName = selectedProject) => {
    setActiveId(null);
    setInputs({ ...defaultInputs, campaignName: '', projectName: projName });
    setMetrics(null);
    setAnalysis(null);
    setViewMode('analyze');
  };

  const handleProjectChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW_PROJECT') {
      const newProj = window.prompt("กรุณาใส่ชื่อโครงการใหม่ (เช่น ทาวน์โฮม โซนชลบุรี):");
      if (newProj && newProj.trim() !== '') {
        const trimmed = newProj.trim();
        if (!projects.includes(trimmed)) {
          setProjects(prev => [...prev, trimmed]);
        }
        setSelectedProject(trimmed);
        handleNewCampaign(trimmed);
      }
    } else {
      setSelectedProject(val);
      handleNewCampaign(val);
    }
  };

  const handleLoadCampaign = (campaign) => {
    setActiveId(campaign.id);
    setInputs(campaign.inputs);
    setMetrics(campaign.metrics);
    setAnalysis(campaign.analysis);
    setViewMode('analyze');
  };

  const handleDeleteCampaign = (idToDelete, e) => {
    e.stopPropagation();
    if(window.confirm("คุณต้องการลบแคมเปญที่บันทึกไว้นี้ใช่หรือไม่?")) {
      setSavedCampaigns(prev => prev.filter(c => c.id !== idToDelete));
      if (activeId === idToDelete) handleNewCampaign();
    }
  };

  // UI Helpers
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDecimal = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const StatusIcon = ({ status }) => {
    if (status === 'good') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status) => {
    if (status === 'good') return 'bg-green-50 border-green-200 text-green-800';
    if (status === 'warning') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  // Helper ฟอร์แมตวันที่ให้อ่านง่ายขึ้น (DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // --- RENDER COMPARE DASHBOARD ---
  const renderCompareDashboard = () => {
    if (activeCampaigns.length === 0) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center min-h-[400px]">
          <BarChart2 className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-medium text-slate-600">ยังไม่มีข้อมูลสำหรับ {selectedProject}</h3>
          <p className="text-sm text-slate-400 mt-2 mb-6">คุณต้องบันทึกแคมเปญโฆษณาของโครงการนี้อย่างน้อย 1 แคมเปญก่อน</p>
          <button onClick={() => setViewMode('analyze')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors">ไปสร้างแคมเปญแรก</button>
        </div>
      );
    }

    // Find Winners เฉพาะโครงการนี้
    let bestCpaCampaign = null;
    let bestCtrCampaign = null;
    
    // แยกตาม Objective ก่อนเปรียบเทียบ CPA
    const chatCampaigns = activeCampaigns.filter(c => c.inputs.objective === 'chat');
    const formCampaigns = activeCampaigns.filter(c => c.inputs.objective === 'form');
    
    if(chatCampaigns.length > 0) {
      bestCpaCampaign = chatCampaigns.reduce((prev, current) => (prev.metrics.cpa < current.metrics.cpa) ? prev : current);
    } else if (formCampaigns.length > 0) {
      bestCpaCampaign = formCampaigns.reduce((prev, current) => (prev.metrics.cpa < current.metrics.cpa) ? prev : current);
    }

    bestCtrCampaign = activeCampaigns.reduce((prev, current) => (prev.metrics.ctr > current.metrics.ctr) ? prev : current);

    // Calculate Totals เฉพาะโครงการนี้
    const totalSpend = activeCampaigns.reduce((sum, c) => sum + c.inputs.spend, 0);
    const totalResults = activeCampaigns.reduce((sum, c) => sum + c.inputs.results, 0);
    const avgCpa = totalResults > 0 ? totalSpend / totalResults : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Total Summary Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
            <h3 className="text-blue-100 font-medium text-sm mb-1">งบโฆษณารวม (Total Spend)</h3>
            <div className="text-3xl font-bold">฿{formatMoney(totalSpend)}</div>
            <div className="text-blue-200 text-xs mt-2">จากทั้งหมด {activeCampaigns.length} แคมเปญ ในโครงการนี้</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-md">
            <h3 className="text-emerald-100 font-medium text-sm mb-1">ผลลัพธ์รวม (Total Leads/Chats)</h3>
            <div className="text-3xl font-bold">{formatMoney(totalResults)} <span className="text-lg font-medium opacity-80">รายชื่อ</span></div>
            <div className="text-emerald-200 text-xs mt-2">ยอดคนที่ทักหรือให้เบอร์ทั้งหมด</div>
          </div>
          <div className="bg-white border-2 border-indigo-100 rounded-xl p-5 shadow-sm flex flex-col justify-center">
            <h3 className="text-slate-500 font-medium text-sm mb-1">ต้นทุนเฉลี่ยรวม (Avg. Cost per Result)</h3>
            <div className="text-3xl font-bold text-slate-800">฿{formatMoney(avgCpa)}</div>
            <div className="text-slate-400 text-xs mt-2">ค่าเฉลี่ยของทุกแคมเปญรวมกัน</div>
          </div>
        </div>

        {/* Highlights (Winners) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestCpaCampaign && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10"><Trophy className="w-32 h-32 text-amber-500"/></div>
              <div className="bg-amber-100 p-3 rounded-full text-amber-600 z-10"><Trophy className="w-6 h-6"/></div>
              <div className="z-10">
                <h3 className="text-amber-800 font-bold text-sm">แชมเปี้ยนด้านต้นทุนถูกที่สุด (Best CPA)</h3>
                <p className="text-slate-800 font-semibold mt-1">{bestCpaCampaign.inputs.campaignName}</p>
                <p className="text-sm text-slate-600">ต้นทุนเพียง <span className="font-bold text-amber-700">฿{formatMoney(bestCpaCampaign.metrics.cpa)}</span> / {bestCpaCampaign.inputs.objective === 'chat' ? 'ทักแชท' : 'ฟอร์ม'}</p>
              </div>
            </div>
          )}
          {bestCtrCampaign && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10"><MousePointerClick className="w-32 h-32 text-purple-500"/></div>
              <div className="bg-purple-100 p-3 rounded-full text-purple-600 z-10"><MousePointerClick className="w-6 h-6"/></div>
              <div className="z-10">
                <h3 className="text-purple-800 font-bold text-sm">แชมเปี้ยนด้านภาพดึงดูดที่สุด (Best CTR)</h3>
                <p className="text-slate-800 font-semibold mt-1">{bestCtrCampaign.inputs.campaignName}</p>
                <p className="text-sm text-slate-600">อัตราการคลิกสูงถึง <span className="font-bold text-purple-700">{formatDecimal(bestCtrCampaign.metrics.ctr)}%</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-gray-200 p-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-600"/> ตารางเปรียบเทียบทุกแคมเปญ (Leaderboard)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">ภาพ Ads</th>
                  <th className="px-4 py-3 font-medium">ชื่อแคมเปญ</th>
                  <th className="px-4 py-3 font-medium">เป้าหมาย</th>
                  <th className="px-4 py-3 font-medium text-right">งบที่ใช้</th>
                  <th className="px-4 py-3 font-medium text-right">ผลลัพธ์</th>
                  <th className="px-4 py-3 font-bold text-slate-800 bg-blue-50/30 text-right">CPA (ต้นทุน)</th>
                  <th className="px-4 py-3 font-medium text-right">CTR (ความน่าสนใจ)</th>
                  <th className="px-4 py-3 font-medium text-right">CPM (การเข้าถึง)</th>
                  <th className="px-4 py-3 font-medium text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeCampaigns.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded bg-slate-100 border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {c.inputs.adImage ? <img src={c.inputs.adImage} alt="ad" className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-slate-300"/>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{c.inputs.campaignName}</div>
                      <div className="text-[10px] text-blue-600 mt-0.5 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3"/> อัปเดต: {formatDate(c.inputs.dataAsOfDate)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-[150px]" title={c.inputs.targetLocation}>
                        <MapPin className="w-3 h-3 inline mr-0.5"/> {c.inputs.targetLocation || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${c.inputs.objective === 'chat' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {c.inputs.objective === 'chat' ? 'ทักแชท' : 'ฟอร์ม'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">฿{formatMoney(c.inputs.spend)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(c.inputs.results)}</td>
                    <td className="px-4 py-3 text-right font-bold bg-blue-50/30">
                      <div className={`flex justify-end items-center gap-1.5 ${c.metrics.cpaStatus === 'bad' ? 'text-red-600' : c.metrics.cpaStatus === 'warning' ? 'text-yellow-600' : 'text-emerald-600'}`}>
                        ฿{formatMoney(c.metrics.cpa)}
                        {bestCpaCampaign?.id === c.id && <Trophy className="w-3.5 h-3.5 text-amber-500" title="ดีที่สุด"/>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`flex justify-end items-center gap-1.5 ${c.metrics.ctrStatus === 'bad' ? 'text-red-600' : ''}`}>
                        {formatDecimal(c.metrics.ctr)}%
                        {bestCtrCampaign?.id === c.id && <Trophy className="w-3.5 h-3.5 text-purple-500" title="ดีที่สุด"/>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">฿{formatMoney(c.metrics.cpm)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleLoadCampaign(c)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors" title="ดูรายละเอียด">
                           <Eye className="w-4 h-4"/>
                         </button>
                         <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors" title="ลบ">
                           <Trash2 className="w-4 h-4"/>
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // --- RENDER ANALYZE DASHBOARD (Existing) ---
  const renderAnalyzeDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* --- LEFT COLUMN: INPUT FORM --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2 flex items-center justify-between">
          <span>1. กรอกข้อมูลโฆษณา</span>
          {activeId && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">บันทึกอยู่ในระบบแล้ว</span>}
        </h2>
        
        <div className="space-y-4">
          
          {/* Campaign Info & Dates */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">ชื่อแคมเปญ (เพื่อบันทึก)</label>
              <input 
                type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} 
                placeholder="เช่น แคมเปญโปรสิงหา 66"
                className="w-full rounded-lg border-blue-300 bg-blue-50/30 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors" 
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> เริ่มแคมเปญ</label>
                <input type="date" name="startDate" value={inputs.startDate} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> สิ้นสุด</label>
                <input type="date" name="endDate" value={inputs.endDate} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> อัปเดตข้อมูล ณ</label>
                <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full rounded-lg border-blue-300 bg-blue-50 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* Creative & Targeting */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />กลุ่มเป้าหมาย (Targeting)</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">พื้นที่ปักหมุด (Location/Radius)</label>
                <input type="text" name="targetLocation" value={inputs.targetLocation} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น รัศมี 10 กม. รอบนิคม..." />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">อายุ (Age)</label>
                <input type="text" name="targetAge" value={inputs.targetAge} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น 25-45" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">ข้อมูลประชากร (Demographics)</label>
                <input type="text" name="targetDemographics" value={inputs.targetDemographics} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น พนักงานบริษัท" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">ความสนใจ (Interests)</label>
                <input type="text" name="targetInterests" value={inputs.targetInterests} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น สินเชื่อบ้าน, อสังหาริมทรัพย์" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">พฤติกรรม (Behaviors)</label>
                <input type="text" name="targetBehaviors" value={inputs.targetBehaviors} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-xs focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น ผู้ที่เพิ่งย้ายที่อยู่" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> รูป Ads</label>
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 hover:bg-gray-50 text-center cursor-pointer transition-colors overflow-hidden h-24 flex flex-col items-center justify-center bg-white">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'adImage')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {inputs.adImage ? <img src={inputs.adImage} alt="Ad Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <UploadCloud className="w-5 h-5 text-gray-400 mb-1" />}
                <span className="text-[11px] text-gray-600 relative z-10 font-medium bg-white/80 px-2 py-0.5 rounded">{inputs.adImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูปโฆษณา'}</span>
              </div>
            </div>
          </div>

          {/* Data Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">เป้าหมายแคมเปญ</label>
              <select name="objective" value={inputs.objective} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm">
                <option value="chat">ข้อความ (Messenger)</option><option value="form">ฟอร์ม (Lead Gen)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">เงินที่จ่าย (Spend - บาท)</label>
              <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">แสดงผล (Impressions)</label>
              <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เข้าถึง (Reach)</label>
              <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">คลิกลิงก์ (Clicks)</label>
              <input type="number" name="clicks" value={inputs.clicks} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ผลลัพธ์ (ทัก/ฟอร์ม)</label>
              <input type="number" name="results" value={inputs.results} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2 text-sm font-bold text-blue-700" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 mt-2 border-t">
            <button onClick={() => handleAnalyze()} disabled={isAnalyzingImage} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors border border-slate-200 disabled:opacity-50">
              ดูผลชั่วคราว
            </button>
            <button onClick={handleSave} disabled={isAnalyzingImage} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70">
              {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
              {isAnalyzingImage ? 'กำลังวิเคราะห์รูปด้วย AI และบันทึก...' : (activeId ? 'อัปเดตและบันทึก' : 'บันทึกแคมเปญนี้')}
            </button>
          </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: RESULTS & ANALYSIS --- */}
      <div className="lg:col-span-2 space-y-5">
        {metrics && analysis ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><Users className="w-4 h-4"/> Targeting & Info</div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm h-[120px] overflow-y-auto">
                    <div className="border-b border-slate-200 pb-2 mb-2">
                      <span className="font-bold text-slate-800 block">{inputs.campaignName || 'แคมเปญไม่มีชื่อ'}</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(inputs.startDate)} - {formatDate(inputs.endDate)}</span>
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Clock className="w-3 h-3"/> อัปเดต: {formatDate(inputs.dataAsOfDate)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                      <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">พื้นที่:</span> <span className="truncate" title={inputs.targetLocation}>{inputs.targetLocation || '-'}</span></div>
                      <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">อายุ:</span> <span className="truncate" title={inputs.targetAge}>{inputs.targetAge || '-'}</span></div>
                      <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">ประชากร:</span> <span className="truncate" title={inputs.targetDemographics}>{inputs.targetDemographics || '-'}</span></div>
                      <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">ความสนใจ:</span> <span className="truncate" title={inputs.targetInterests}>{inputs.targetInterests || '-'}</span></div>
                      <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">พฤติกรรม:</span> <span className="truncate" title={inputs.targetBehaviors}>{inputs.targetBehaviors || '-'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <div className="w-[120px] h-[120px] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
                    {inputs.adImage ? <img src={inputs.adImage} alt="Ad" className="w-full h-full object-cover" /> : <div className="text-center p-2"><ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1"/><span className="text-[10px] text-slate-400">ไม่มีรูป Ads</span></div>}
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-800/80 text-white text-[10px] text-center py-0.5">ชิ้นงาน Ads</div>
                  </div>
                </div>
              </div>

              {/* AI Vision Analysis Section */}
              {(inputs.adImageAnalysis || imageAnalysisError) && (
                <div className="mt-2 border-t pt-4">
                  {inputs.adImageAnalysis && (
                    <div className="bg-purple-50 rounded-lg border border-purple-100 p-4 relative">
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-200/50 to-transparent w-32 h-full rounded-r-lg pointer-events-none"></div>
                      <h4 className="text-purple-800 font-bold text-sm flex items-center gap-1.5 mb-2"><Sparkles className="w-4 h-4"/> บทวิจารณ์ภาพจาก AI</h4>
                      <div className="text-sm text-purple-900/80 whitespace-pre-wrap leading-relaxed relative z-10 font-medium">{inputs.adImageAnalysis}</div>
                    </div>
                  )}
                  {imageAnalysisError && <p className="text-xs text-red-500 mt-2">{imageAnalysisError}</p>}
                </div>
              )}
              {inputs.adImage && !inputs.adImageAnalysis && !isAnalyzingImage && (
                 <div className="text-[11px] text-purple-600 font-medium bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 flex items-center gap-2">
                   <Sparkles className="w-3 h-3"/> AI จะวิเคราะห์ภาพนี้โดยอัตโนมัติเมื่อคุณกด "บันทึกแคมเปญนี้"
                 </div>
              )}
            </div>

            <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${analysis.hasIssue ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              {analysis.hasIssue ? <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" /> : <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" />}
              <div>
                <h3 className={`font-semibold ${analysis.hasIssue ? 'text-red-800' : 'text-emerald-800'}`}>บทสรุปประสิทธิภาพตัวเลข</h3>
                <p className={`text-sm mt-1 ${analysis.hasIssue ? 'text-red-700' : 'text-emerald-700'}`}>{analysis.overall}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3.5 rounded-xl border shadow-sm ${getStatusColor(metrics.cpaStatus)}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex justify-between items-center">CPA <StatusIcon status={metrics.cpaStatus} /></div>
                <div className="text-xl font-bold">฿{formatMoney(metrics.cpa)}</div>
              </div>
              <div className={`p-3.5 rounded-xl border shadow-sm ${getStatusColor(metrics.ctrStatus)}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex justify-between items-center">CTR <StatusIcon status={metrics.ctrStatus} /></div>
                <div className="text-xl font-bold">{formatDecimal(metrics.ctr)}%</div>
              </div>
              <div className={`p-3.5 rounded-xl border shadow-sm ${getStatusColor(metrics.freqStatus)}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex justify-between items-center">ความถี่ <StatusIcon status={metrics.freqStatus} /></div>
                <div className="text-xl font-bold">{formatDecimal(metrics.frequency)}</div>
              </div>
              <div className={`p-3.5 rounded-xl border shadow-sm ${getStatusColor(metrics.cpmStatus)}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex justify-between items-center">CPM <StatusIcon status={metrics.cpmStatus} /></div>
                <div className="text-xl font-bold">฿{formatMoney(metrics.cpm)}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-800 text-white p-3.5 flex items-center gap-2">
                <Info className="w-5 h-5" />
                <h2 className="font-semibold text-base">คำแนะนำจากตัวเลข (Data Recommendations)</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="p-4"><h3 className="font-bold text-sm text-slate-800 mb-2">1. Bottom Funnel</h3><ul className="space-y-1.5 text-sm text-slate-600">{analysis.botFunnel.map((text, i) => <li key={i} className="flex gap-2"><span className="text-indigo-500 font-bold">•</span> <span>{text}</span></li>)}</ul></div>
                <div className="p-4"><h3 className="font-bold text-sm text-slate-800 mb-2">2. Middle Funnel</h3><ul className="space-y-1.5 text-sm text-slate-600">{analysis.midFunnel.map((text, i) => <li key={i} className="flex gap-2"><span className="text-blue-500 font-bold">•</span> <span>{text}</span></li>)}</ul></div>
                <div className="p-4"><h3 className="font-bold text-sm text-slate-800 mb-2">3. Top Funnel</h3><ul className="space-y-1.5 text-sm text-slate-600">{analysis.topFunnel.map((text, i) => <li key={i} className="flex gap-2"><span className="text-teal-500 font-bold">•</span> <span>{text}</span></li>)}</ul></div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
            <Calculator className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-500">พร้อมประเมินแคมเปญใหม่</h3>
            <p className="text-sm text-slate-400 mt-2">กรอกข้อมูลตัวเลขให้ครบ แล้วกดปุ่ม "วิเคราะห์และบันทึก"</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Main Navigation */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="text-blue-600" />
              Real Estate Ads Analyzer <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2 flex items-center gap-1 hidden md:flex"><Sparkles className="w-3 h-3"/> AI Vision</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">ระบบประเมินโฆษณาบ้านจัดสรรและเปรียบเทียบแคมเปญ (A/B Testing)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Project Workspace Selector */}
            <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 min-w-[200px]">
              <Building className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0"/>
              <select 
                value={selectedProject} 
                onChange={handleProjectChange}
                className="bg-transparent text-blue-800 font-bold text-sm focus:outline-none cursor-pointer w-full"
              >
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="NEW_PROJECT">+ เพิ่มโครงการใหม่...</option>
              </select>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
              <button 
                onClick={() => setViewMode('analyze')}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'analyze' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard className="w-4 h-4"/> กรอกข้อมูล
              </button>
              <button 
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'compare' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart2 className="w-4 h-4"/> เปรียบเทียบ
                {activeCampaigns.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{activeCampaigns.length}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* --- Top Navigation / Campaign Selector (Only show in Analyze mode) --- */}
        {viewMode === 'analyze' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 w-full">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 hidden sm:block">
                <History className="w-5 h-5" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <span className="font-bold text-slate-700 whitespace-nowrap text-sm">เลือกแคมเปญ:</span>
                <select
                  value={activeId || 'NEW_CAMPAIGN'}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_CAMPAIGN') {
                      handleNewCampaign(selectedProject);
                    } else {
                      const selected = activeCampaigns.find(c => c.id === e.target.value);
                      if (selected) handleLoadCampaign(selected);
                    }
                  }}
                  className="w-full md:w-auto flex-1 rounded-lg border-gray-300 border p-2.5 text-sm font-medium text-slate-800 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-slate-50 hover:bg-white transition-colors"
                >
                  <option value="NEW_CAMPAIGN" className="font-bold text-blue-600">✨ + สร้างแคมเปญใหม่...</option>
                  {activeCampaigns.length > 0 && (
                    <optgroup label="แคมเปญที่บันทึกไว้ในโครงการนี้">
                      {activeCampaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.inputs.campaignName || 'แคมเปญไม่มีชื่อ'} (อัปเดต: {formatDate(c.inputs.dataAsOfDate)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            
            {activeId && (
              <button 
                onClick={(e) => handleDeleteCampaign(activeId, e)} 
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100 text-sm font-medium shrink-0"
                title="ลบแคมเปญนี้"
              >
                <Trash2 className="w-4 h-4" /> ลบข้อมูลทิ้ง
              </button>
            )}
          </div>
        )}

        {/* Dynamic Content Area */}
        {viewMode === 'analyze' ? renderAnalyzeDashboard() : renderCompareDashboard()}

      </div>
    </div>
  );
};

export default App;