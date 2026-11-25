import React, { useState, useRef } from 'react';

// 1. 다이아토닉 스케일 정의 (12개 기본 메이저/마이너 조성 지원)
const SCALES = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  E: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  Ab: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  B: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  Db: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  Gb: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  Am: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  Em: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  Dm: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
};

const NOTE_TO_SEMITONE = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
};

function pitchToMidi(pitch) {
  if (!pitch || pitch === 'REST') return null;
  const match = pitch.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60;
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + (NOTE_TO_SEMITONE[noteName] ?? 0);
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 2. 주요 3화음(I, IV, V) 코드 톤 기반 하행 보이싱 엔진
const CHORDS = {
  I:  [0, 2, 4], // 도, 미, 솔
  IV: [3, 5, 0], // 파, 라, 도
  V:  [4, 6, 1], // 솔, 시, 레
};

// 계이름별 기본 배정 코드 (0:도->I, 1:레->V, 2:미->I, 3:파->IV, 4:솔->I, 5:라->IV, 6:시->V)
const NOTE_CHORD_MAP = ['I', 'V', 'I', 'IV', 'I', 'IV', 'V'];

function calculateHarmonyPitch(melodyPitch, keySig, part) {
  if (!melodyPitch || melodyPitch === 'REST') return 'REST';
  const match = melodyPitch.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return melodyPitch;

  const [, rawNote, octaveStr] = match;
  let octave = parseInt(octaveStr, 10);
  const scale = SCALES[keySig] || SCALES.C;

  const idx = scale.findIndex((n) => n[0] === rawNote[0]);
  if (idx === -1) return melodyPitch;

  // 1) 현재 멜로디 음이 속한 코드 구성음 배열 찾기
  const chordName = NOTE_CHORD_MAP[idx];
  const chordTones = CHORDS[chordName];
  const posInChord = chordTones.indexOf(idx);

  // 2) 코드 내 다음 아래 구성음 선택 (알토: 1단계 아래 코드톤, 테너: 2단계 아래 코드톤)
  const stepBack = part === 'ALTO' ? 1 : 2;
  const targetChordPos = (posInChord - stepBack + 3) % 3;
  const targetIdx = chordTones[targetChordPos];

  // 3) 멜로디보다 아래 음역대로 옥타브 보정
  const currentSemitone = NOTE_TO_SEMITONE[scale[idx]] ?? 0;
  const targetNote = scale[targetIdx];
  const targetSemitone = NOTE_TO_SEMITONE[targetNote] ?? 0;

  if (targetSemitone >= currentSemitone) {
    octave -= 1;
  }
  if (part === 'TENOR' && currentSemitone - targetSemitone < 5 && targetSemitone < currentSemitone) {
    octave -= 1;
  }

  return `${targetNote}${octave}`;
}

// 시연용 <학교 종> 원본 8마디 전체 데이터
const INITIAL_SCORE = {
  title: '학교 종 (시연용 원본 8마디)',
  keySignature: 'C',
  timeSignature: '4/4',
  beatsPerMeasure: 4,
  measures: [
    {
      measureNumber: 1,
      notes: [
        { id: 'm1-1', pitch: 'G4', duration: 1.0 },
        { id: 'm1-2', pitch: 'G4', duration: 1.0 },
        { id: 'm1-3', pitch: 'A#4', duration: 1.0 }, // 의도된 AI 오인식 예시 (원래 A4)
        { id: 'm1-4', pitch: 'A4', duration: 1.0 },
      ],
    },
    {
      measureNumber: 2,
      notes: [
        { id: 'm2-1', pitch: 'G4', duration: 1.0 },
        { id: 'm2-2', pitch: 'G4', duration: 1.0 },
        { id: 'm2-3', pitch: 'E4', duration: 2.0 },
      ],
    },
    {
      measureNumber: 3,
      notes: [
        { id: 'm3-1', pitch: 'G4', duration: 1.0 },
        { id: 'm3-2', pitch: 'G4', duration: 1.0 },
        { id: 'm3-3', pitch: 'E4', duration: 1.0 },
        { id: 'm3-4', pitch: 'E4', duration: 1.0 },
      ],
    },
    {
      measureNumber: 4,
      notes: [
        { id: 'm4-1', pitch: 'D4', duration: 4.0 },
      ],
    },
    {
      measureNumber: 5,
      notes: [
        { id: 'm5-1', pitch: 'G4', duration: 1.0 },
        { id: 'm5-2', pitch: 'G4', duration: 1.0 },
        { id: 'm5-3', pitch: 'A4', duration: 1.0 },
        { id: 'm5-4', pitch: 'A4', duration: 1.0 },
      ],
    },
    {
      measureNumber: 6,
      notes: [
        { id: 'm6-1', pitch: 'G4', duration: 1.0 },
        { id: 'm6-2', pitch: 'G4', duration: 1.0 },
        { id: 'm6-3', pitch: 'E4', duration: 2.0 },
      ],
    },
    {
      measureNumber: 7,
      notes: [
        { id: 'm7-1', pitch: 'G4', duration: 1.0 },
        { id: 'm7-2', pitch: 'E4', duration: 1.0 },
        { id: 'm7-3', pitch: 'D4', duration: 1.0 },
        { id: 'm7-4', pitch: 'E4', duration: 1.0 },
      ],
    },
    {
      measureNumber: 8,
      notes: [
        { id: 'm8-1', pitch: 'C4', duration: 4.0 },
      ],
    },
  ],
};

const PITCH_OPTIONS = [
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','C#4','Db4','D4','D#4','Eb4','E4','F4','F#4','Gb4','G4','G#4','Ab4','A4','A#4','Bb4','B4',
  'C5','C#5','Db5','D5','D#5','Eb5','E5','F5','F#5','Gb5','G5','G#5','Ab5','A5','A#5','Bb5','B5','C6','REST'
];

export default function App() {
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [usedModel, setUsedModel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [score, setScore] = useState(INITIAL_SCORE);
  const [selectedPart, setSelectedPart] = useState('ALTO');
  const [playMode, setPlayMode] = useState('ENSEMBLE');
  const [tempo, setTempo] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // { measureIdx, noteIdx }

  const audioCtxRef = useRef(null);
  const timeoutsRef = useRef([]);

  const clearScheduledTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });

  // 1단계: Vision AI 악보 이미지 업로드 및 추출
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopAudio();
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
    setUsedModel('');

  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!envApiKey) {
    setErrorMsg('.env 파일에 VITE_GEMINI_API_KEY가 설정되지 않았습니다.');
    return;
  }

    setIsAnalyzing(true);
    try {
      const base64Data = await fileToBase64(file);

      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${envApiKey}`
      );
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error?.message || 'API 키 인증에 실패했습니다.');
      }

      const availableModels = (listData.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));

      const selectedModel =
        availableModels.find((m) => m.includes('gemini-3') && m.includes('flash')) ||
        availableModels.find((m) => m.includes('gemini-2.5') && m.includes('flash')) ||
        availableModels.find((m) => m.includes('gemini') && m.includes('flash'));

      if (!selectedModel) {
        throw new Error('사용 가능한 Gemini Flash 모델을 찾지 못했습니다.');
      }
      setUsedModel(selectedModel);

      const prompt = `
당신은 높은음자리표(Treble Clef) 단선율 악보를 정밀 판독하는 음악 이론 및 광학 악보 인식(OMR) 전문가입니다.
첨부된 악보 이미지를 한 마디씩 차례대로 정밀하게 읽어 아래 JSON 형식으로 변환하세요.

[정밀 판독 규칙]
1. 조표(Key Signature) 판별: 높은음자리표 바로 오른쪽의 # 또는 b 개수를 정확히 세세요.
   - 없음: "C", # 1개(F#): "G", # 2개(F#,C#): "D", # 3개(F#,C#,G#): "A", # 4개: "E"
   - b 1개(Bb): "F", b 2개(Bb,Eb): "Bb", b 3개(Bb,Eb,Ab): "Eb"
   - 조표에 걸린 음(예: A Major의 파, 도, 솔)은 반드시 # 또는 b을 붙여서 표기하세요 (예: "C#5", "F#4", "G#4").
2. 오선지 기준 음높이(pitch) 계산:
   - 아래 첫째줄=E4, 첫째칸=F4, 둘째줄=G4, 둘째칸=A4, 셋째줄=B4, 셋째칸=C5, 넷째줄=D5, 넷째칸=E5, 다섯째줄=F5
   - 음표 머리의 중심이 줄에 걸쳐 있는지, 칸에 들어 있는지 정확히 구분하세요. 쉼표는 "REST"로 표기합니다.
3. 박자(duration) 계산:
   - 4분음표=1.0, 점4분음표=1.5, 8분음표=0.5, 점8분음표=0.75, 16분음표=0.25, 2분음표=2.0, 점2분음표=3.0, 온음표=4.0
   - 마디 세로줄(Bar line)을 기준으로 마디를 나누고, 각 마디의 duration 합계가 박자표(4/4=4.0, 3/4=3.0)와 맞도록 검증하세요.

반드시 순수 JSON 객체만 출력하세요.
{
  "title": "악보 제목",
  "keySignature": "A",
  "timeSignature": "4/4",
  "beatsPerMeasure": 4,
  "measures": [
    {
      "measureNumber": 1,
      "notes": [
        { "pitch": "REST", "duration": 0.5 },
        { "pitch": "E4", "duration": 0.5 }
      ]
    }
  ]
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${envApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: file.type,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Vision AI API 호출 중 오류가 발생했습니다.');
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('AI로부터 응답 데이터를 받지 못했습니다.');

      const parsed = JSON.parse(rawText);

      const formattedMeasures = (parsed.measures || []).map((m, mIdx) => ({
        measureNumber: m.measureNumber || mIdx + 1,
        notes: (m.notes || []).map((n, nIdx) => ({
          id: `ai-m${mIdx + 1}-${nIdx}-${Date.now()}`,
          pitch: n.pitch || 'C4',
          duration: Number(n.duration) || 1.0,
        })),
      }));

      setScore({
        title: parsed.title || file.name,
        keySignature: SCALES[parsed.keySignature] ? parsed.keySignature : 'C',
        timeSignature: parsed.timeSignature || '4/4',
        beatsPerMeasure: Number(parsed.beatsPerMeasure) || 4,
        measures: formattedMeasures,
      });
    } catch (err) {
      setErrorMsg(`분석 실패: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 음정/박자 수정 핸들러
  const updateNote = (measureIdx, noteIdx, field, value) => {
    const updatedMeasures = score.measures.map((m, mIdx) => {
      if (mIdx !== measureIdx) return m;
      const updatedNotes = m.notes.map((n, nIdx) =>
        nIdx === noteIdx ? { ...n, [field]: field === 'duration' ? parseFloat(value) : value } : n
      );
      return { ...m, notes: updatedNotes };
    });
    setScore({ ...score, measures: updatedMeasures });
  };

  const addNote = (measureIdx) => {
    const updatedMeasures = score.measures.map((m, mIdx) => {
      if (mIdx !== measureIdx) return m;
      return {
        ...m,
        notes: [...m.notes, { id: `m${mIdx + 1}-${Date.now()}`, pitch: 'C4', duration: 1.0 }],
      };
    });
    setScore({ ...score, measures: updatedMeasures });
  };

  const deleteNote = (measureIdx, noteIdx) => {
    const updatedMeasures = score.measures.map((m, mIdx) => {
      if (mIdx !== measureIdx) return m;
      return { ...m, notes: m.notes.filter((_, idx) => idx !== noteIdx) };
    });
    setScore({ ...score, measures: updatedMeasures });
  };

  // 3. Web Audio API 오디오 재생 + 실시간 마디/음표 하이라이트 동기화
  const playAudio = () => {
    if (isPlaying) return;
    clearScheduledTimeouts();
    setIsPlaying(true);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const secPerBeat = 60 / tempo;
    const startBaseTime = ctx.currentTime + 0.1;
    let currentTime = startBaseTime;

    const scheduleTone = (midi, startTime, durationSec, waveType, volume) => {
      if (!midi) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(midiToFreq(midi), startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.setValueAtTime(volume, startTime + durationSec - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + durationSec);
    };

    score.measures.forEach((measure, mIdx) => {
      measure.notes.forEach((note, nIdx) => {
        const durSec = note.duration * secPerBeat;
        const melodyMidi = pitchToMidi(note.pitch);
        const harmonyPitch = calculateHarmonyPitch(note.pitch, score.keySignature, selectedPart);
        const harmonyMidi = pitchToMidi(harmonyPitch);

        if (playMode === 'ENSEMBLE') {
          scheduleTone(melodyMidi, currentTime, durSec * 0.95, 'sine', 0.25);
        }
        scheduleTone(harmonyMidi, currentTime, durSec * 0.95, 'triangle', 0.35);

        // 현재 연주 중인 마디와 음표 위치 하이라이트 예약
        const delayMs = Math.max(0, (currentTime - startBaseTime) * 1000);
        const tId = setTimeout(() => {
          setActiveStep({ measureIdx: mIdx, noteIdx: nIdx });
        }, delayMs);
        timeoutsRef.current.push(tId);

        currentTime += durSec;
      });
    });

    const totalDurationMs = Math.max(0, (currentTime - startBaseTime) * 1000);
    const endTimeoutId = setTimeout(() => {
      setIsPlaying(false);
      setActiveStep(null);
    }, totalDurationMs + 50);
    timeoutsRef.current.push(endTimeoutId);
  };

  const stopAudio = () => {
    clearScheduledTimeouts();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setActiveStep(null);
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header style={{ borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '24px' }}>🎵 화음 도우미 (Harmony Helper)</h1>
        <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '14px' }}>
          단선율 악보 이미지 기반 Vision AI 음정 추출 및 주요 3화음 코드 톤 기반 성부(알토/테너) 연습 웹앱
        </p>
      </header>

      {/* 1단계: 악보 이미지 업로드 및 Vision AI 추출 */}
      <section style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '18px', borderRadius: '10px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#1e3a8a', marginTop: 0 }}>1. 악보 이미지 업로드 및 AI 음정 추출</h2>


        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            📷 단선율 악보 이미지 선택 (PNG/JPG)
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={() => {
              stopAudio();
              setScore(INITIAL_SCORE);
              setImagePreview(null);
              setErrorMsg('');
              setUsedModel('');
            }}
            style={{
              background: '#e2e8f0',
              color: '#334155',
              padding: '10px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            시연용 샘플(&lt;학교 종&gt;) 불러오기
          </button>
        </div>

        {isAnalyzing && (
          <div style={{ marginTop: '12px', color: '#2563eb', fontWeight: 'bold' }}>
            ⏳ Vision AI ({usedModel || 'Flash 모델'})가 악보의 조표, 음정, 박자를 정밀 분석하고 있습니다...
          </div>
        )}

        {!isAnalyzing && usedModel && !errorMsg && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
            ✓ 사용된 Vision AI 모델: {usedModel}
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '13px', fontWeight: 'bold' }}>
            ⚠ {errorMsg}
          </div>
        )}

        {imagePreview && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>업로드된 원본 악보 (대조용):</div>
            <img
              src={imagePreview}
              alt="업로드된 악보"
              style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        )}
      </section>

      {/* 조성 및 기본 정보 바 */}
      <section style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <strong>곡명:</strong> {score.title}
        </div>
        <div>
          <label><strong>조성(Key): </strong></label>
          <select
            value={score.keySignature}
            onChange={(e) => setScore({ ...score, keySignature: e.target.value })}
            style={{ padding: '4px 8px', borderRadius: '4px' }}
          >
            {Object.keys(SCALES).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label><strong>박자: </strong></label>
          <select
            value={score.beatsPerMeasure}
            onChange={(e) => {
              const beats = Number(e.target.value);
              setScore({ ...score, beatsPerMeasure: beats, timeSignature: `${beats}/4` });
            }}
            style={{ padding: '4px 8px', borderRadius: '4px' }}
          >
            <option value={4}>4/4 (마디당 4박)</option>
            <option value={3}>3/4 (마디당 3박)</option>
          </select>
        </div>
      </section>

      {/* 3단계: 성부 선택, 템포(BPM) 조절 및 Web Audio API 재생 (편의성을 위해 테이블 상단 배치) */}
      <section style={{ background: '#eff6ff', padding: '20px', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#1e3a8a', marginTop: 0 }}>2. 연습 성부 선택 및 화음 오디오 재생</h2>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>연습 성부 선택:</div>
            <button
              onClick={() => setSelectedPart('ALTO')}
              style={{
                padding: '8px 14px',
                marginRight: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: selectedPart === 'ALTO' ? '#2563eb' : '#cbd5e1',
                color: selectedPart === 'ALTO' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
              }}
            >
              알토 (코드 내 하행 1단)
            </button>
            <button
              onClick={() => setSelectedPart('TENOR')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: selectedPart === 'TENOR' ? '#2563eb' : '#cbd5e1',
                color: selectedPart === 'TENOR' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
              }}
            >
              테너 (코드 내 하행 2단)
            </button>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>재생 모드:</div>
            <button
              onClick={() => setPlayMode('SOLO')}
              style={{
                padding: '8px 14px',
                marginRight: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: playMode === 'SOLO' ? '#0d9488' : '#cbd5e1',
                color: playMode === 'SOLO' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
              }}
            >
              내 성부만 듣기 (단독)
            </button>
            <button
              onClick={() => setPlayMode('ENSEMBLE')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: playMode === 'ENSEMBLE' ? '#0d9488' : '#cbd5e1',
                color: playMode === 'ENSEMBLE' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
              }}
            >
              멜로디 + 내 성부 (합주)
            </button>
          </div>

          {/* 템포(BPM) 조절 슬라이더 */}
          <div style={{ minWidth: '180px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
              연습 속도 (템포): <span style={{ color: '#2563eb' }}>{tempo} BPM</span>
            </div>
            <input
              type="range"
              min={60}
              max={150}
              step={5}
              value={tempo}
              disabled={isPlaying}
              onChange={(e) => setTempo(Number(e.target.value))}
              style={{ width: '100%', cursor: isPlaying ? 'not-allowed' : 'pointer' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isPlaying ? (
            <button
              onClick={playAudio}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              ▶ 화음 오디오 재생하기
            </button>
          ) : (
            <button
              onClick={stopAudio}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              ■ 정지
            </button>
          )}
          {isPlaying && activeStep && (
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>
              ♪ 제 {activeStep.measureIdx + 1}마디 연주 중...
            </span>
          )}
        </div>
      </section>

      {/* 2단계: 음정/박자 확인 및 수정 테이블 (실시간 하이라이트 적용) */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#0f172a' }}>3. 추출된 멜로디 확인 및 수정 (오인식 교정)</h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          * 원본 악보와 비교하여 오인식된 음정이나 박자를 수정하세요. 재생 시 현재 연주되는 마디와 음표가 실시간으로 강조됩니다.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {score.measures.map((measure, mIdx) => {
            const totalBeats = measure.notes.reduce((sum, n) => sum + n.duration, 0);
            const isBeatValid = Math.abs(totalBeats - score.beatsPerMeasure) < 0.01;
            const isMeasureActive = activeStep?.measureIdx === mIdx;

            return (
              <div
                key={measure.measureNumber}
                style={{
                  border: isMeasureActive
                    ? '2.5px solid #16a34a'
                    : isBeatValid
                    ? '1px solid #cbd5e1'
                    : '2px solid #ef4444',
                  boxShadow: isMeasureActive ? '0 0 12px rgba(22, 163, 74, 0.25)' : 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  background: isMeasureActive ? '#f0fdf4' : '#ffffff',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ color: isMeasureActive ? '#15803d' : '#0f172a' }}>
                    {isMeasureActive ? `▶ 제 ${measure.measureNumber} 마디` : `제 ${measure.measureNumber} 마디`}
                  </strong>
                  <span style={{ fontSize: '12px', color: isBeatValid ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                    {isBeatValid ? `✓ 박자 정상 (${totalBeats}/${score.beatsPerMeasure})` : `⚠ 박자 불일치 (${totalBeats}/${score.beatsPerMeasure})`}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>멜로디 음정</th>
                      <th style={{ padding: '6px' }}>박자</th>
                      <th style={{ padding: '6px', color: '#2563eb' }}>계산된 화음</th>
                      <th style={{ padding: '6px' }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measure.notes.map((note, nIdx) => {
                      const harmony = calculateHarmonyPitch(note.pitch, score.keySignature, selectedPart);
                      const isNoteActive = isMeasureActive && activeStep?.noteIdx === nIdx;

                      return (
                        <tr
                          key={note.id}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: isNoteActive ? '#fef08a' : 'transparent',
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <td style={{ padding: '6px' }}>
                            <select
                              value={note.pitch}
                              onChange={(e) => updateNote(mIdx, nIdx, 'pitch', e.target.value)}
                              style={{
                                padding: '4px',
                                fontWeight: note.pitch.includes('#') || note.pitch.includes('b') || isNoteActive ? 'bold' : 'normal',
                                color: note.pitch === 'A#4' ? '#dc2626' : '#0f172a',
                              }}
                            >
                              {PITCH_OPTIONS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px' }}>
                            <select
                              value={note.duration}
                              onChange={(e) => updateNote(mIdx, nIdx, 'duration', e.target.value)}
                              style={{ padding: '4px' }}
                            >
                              <option value={0.25}>0.25 (16분)</option>
                              <option value={0.5}>0.5 (8분)</option>
                              <option value={0.75}>0.75 (점8분)</option>
                              <option value={1.0}>1.0 (4분)</option>
                              <option value={1.5}>1.5 (점4분)</option>
                              <option value={2.0}>2.0 (2분)</option>
                              <option value={3.0}>3.0 (점2분)</option>
                              <option value={4.0}>4.0 (온음)</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px', fontWeight: 'bold', color: isNoteActive ? '#b45309' : '#2563eb' }}>
                            {harmony}
                          </td>
                          <td style={{ padding: '6px' }}>
                            <button
                              onClick={() => deleteNote(mIdx, nIdx)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <button
                  onClick={() => addNote(mIdx)}
                  style={{ marginTop: '8px', fontSize: '12px', padding: '4px 8px', cursor: 'pointer' }}
                >
                  + 음표 추가
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}