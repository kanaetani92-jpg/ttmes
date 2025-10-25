'use client';
import { useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type Stage = 'PC'|'C'|'PR'|'A'|'M';

export default function AssessmentForm() {
  const [stage, setStage] = useState<Stage>('C');
  const [vals, setVals] = useState({
    pssm: 15, pdsmPros: 12, pdsmCons: 8, ppsmExp: 15, ppsmBeh: 15,
    risciStress: 8, risciCoping: 10, smaPlan: 6, smaRef: 7, smaHealthy: 6
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any|null>(null);
  const [error, setError] = useState<string|null>(null);

  function num(name: string, min: number, max: number) {
    return (
      <div className="grid grid-cols-2 items-center gap-2">
        <label className="text-sm">{name} ({min}〜{max})</label>
        <input className="input" type="number" min={min} max={max}
          value={(vals as any)[name]} onChange={e=>setVals(v=>({...v, [name]: Number(e.target.value)}))} />
      </div>
    );
  }

  async function submit() {
    setError(null); setLoading(true);
    try {
      const user = auth.currentUser; if (!user) throw new Error('Not signed in');
      const token = await getIdToken(user, true);
      const payload = {
        scores: {
          stage,
          pssm: { self_efficacy: vals.pssm },
          pdsm: { pros: vals.pdsmPros, cons: vals.pdsmCons },
          ppsm: { experiential: vals.ppsmExp, behavioral: vals.ppsmBeh },
          risci: { stress: vals.risciStress, coping: vals.risciCoping },
          sma: { planning: vals.smaPlan, reframing: vals.smaRef, healthy_activity: vals.smaHealthy }
        },
        useGemini: false
      };
      const res = await fetch('/api/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setResult(json);

      // Optional: save last input client-side
      const ref = doc(db, 'users', user.uid, 'assessments', json.id);
      await setDoc(ref, { createdAt: serverTimestamp(), payload }, { merge: true });
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-xl font-bold">オンラインアセスメント</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-sm">変容ステージ</label>
          <select className="input" value={stage} onChange={e=>setStage(e.target.value as Stage)}>
            <option value="PC">前熟考</option>
            <option value="C">熟考</option>
            <option value="PR">準備</option>
            <option value="A">実行</option>
            <option value="M">維持</option>
          </select>
        </div>
        {num('pssm',5,25)}
        {num('pdsmPros',3,15)}
        {num('pdsmCons',3,15)}
        {num('ppsmExp',5,25)}
        {num('ppsmBeh',5,25)}
        {num('risciStress',3,15)}
        {num('risciCoping',3,15)}
        {num('smaPlan',2,10)}
        {num('smaRef',2,10)}
        {num('smaHealthy',2,10)}
      </div>
      <button className="btn" onClick={submit} disabled={loading}>{loading?'生成中…':'処方箋を生成'}</button>
      {error && <p className="text-red-300">{error}</p>}
      {result && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold">個別フィードバック</h3>
          {result.messages.map((m:any)=>(
            <div key={m.id} className="p-4 rounded-xl" style={{background:'#0e1330', border:'1px solid #2a315a'}}>
              <div className="text-sm opacity-60">{m.id}</div>
              <div className="font-semibold">{m.title}</div>
              <p className="opacity-90">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
