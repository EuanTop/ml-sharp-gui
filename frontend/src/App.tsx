import React, { useEffect, useState, useRef } from 'react'
import { GaussianViewer } from './components/GaussianViewer'

type PredictResult = {
  positions: number[][],
  colors: number[][],
  sizes: number[],
  opacities: number[],
  ply_url: string,
  count: number,
  device: string,
  checkpoint?: string | null
}

export type EffectType = 'None' | 'Magic' | 'Spread' | 'Unroll' | 'Twister' | 'Rain';

// Simple SVG Icons
const ResetIcon = () => (
  <img src="/reset-forward-svgrepo-com.svg" width="14" height="14" style={{ filter: 'invert(0.6)' }} alt="Reset" />
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Loading Animation Component
const LoadingOverlay = ({ t }: { t: (key: string) => string }) => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div className="blobs" style={{
      filter: 'url(#goo)',
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    }}>
      <div className="blob one" style={{
        position: 'fixed',
        background: 'linear-gradient(90deg, #fff, #ddd, #999, #333, #333, #999, #ddd, #fff)',
        backgroundSize: '1000% 1000%',
        top: '50%',
        left: '50%',
        width: 60,
        height: 60,
        borderRadius: '100%',
        marginTop: -30,
        marginLeft: -30,
        filter: 'blur(1px)',
        animation: 'moon 3s infinite ease-in-out'
      }} />
      <div className="blob four move" style={{
        position: 'fixed',
        background: 'rgba(255,255,255,1)',
        top: '50%',
        left: 'calc(50% - 30px)',
        width: 60,
        height: 60,
        borderRadius: '100%',
        marginTop: -30,
        marginLeft: -30,
        transform: 'scale(0.7)',
        filter: 'blur(20px)',
        animation: 'loader 3s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }} />
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
    <div style={{
      position: 'absolute',
      bottom: '40%',
      color: '#fff',
      fontSize: 16,
      fontWeight: 300,
      fontFamily: 'Merriweather, Georgia, serif'
    }}>
      {t('generating3d')}
    </div>
    <style>{`
      @keyframes loader {
        0% { transform: translate(180px, 0px) scale(0.7); }
        25% { transform: translate(15px, 0px) scale(0.7); }
        50% { transform: translate(-150px, 0px) scale(0.7); }
        75% { transform: translate(15px, 0px) scale(0.7); }
        100% { transform: translate(180px, 0px) scale(0.7); }
      }
      @keyframes moon {
        0% { background-position: 100% 50%; }
        25% { background-position: 50% 50%; }
        50% { background-position: 0% 50%; }
        75% { background-position: 50% 50%; }
        100% { background-position: 100% 50%; }
      }
      @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
      }
    `}</style>
  </div>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PredictResult | null>(null)
  const [maxPoints, setMaxPoints] = useState(120000)
  const [modelPath, setModelPath] = useState<string>('~/.cache/torch/hub/checkpoints/')
  const [device, setDevice] = useState<string>('default')
  const [overrideCkpt, setOverrideCkpt] = useState<string>('')
  const [pointScale, setPointScale] = useState<number>(80)
  const [modelScale, setModelScale] = useState<number>(2.5)
  const [effect, setEffect] = useState<EffectType>('None')
  const [effectDirection, setEffectDirection] = useState<'X' | 'Y' | 'Z'>('Y')
  const [resetAnim, setResetAnim] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [language, setLanguage] = useState<string>('en')
  const [showAxes, setShowAxes] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [deviceAvailability, setDeviceAvailability] = useState<{cuda: boolean, mps: boolean} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [inputMode, setInputMode] = useState<'image' | 'ply'>('image')
  const [cameraViewTrigger, setCameraViewTrigger] = useState<{view: string, timestamp: number} | null>(null)
  const [showAllUI, setShowAllUI] = useState(true)
  const [showEscHint, setShowEscHint] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioData, setAudioData] = useState<{bass: number, mid: number, high: number}>({bass: 0, mid: 0, high: 0})
  const [audioVisualization, setAudioVisualization] = useState<'none' | 'pulse' | 'wave' | 'explode'>('none')
  const isPlayingRef = useRef(false)

  const t = (key: string) => {
    const lang = language
    const translations: Record<string, Record<string, string>> = {
      en: { selectImage: 'Select', generate: 'Generate', generating: 'Generating', pointSize: 'Point Size', modelScale: 'Model Scale', maxPoints: 'Max Points', effects: 'Effects', effectDirection: 'Effect Direction', imagePlane: 'Image Plane', resetAnim: 'Reset Animation', advancedSettings: 'Advanced Settings', modelPath: 'Model Path', device: 'Device', checkpointOverride: 'Checkpoint Override (Optional)', browse: 'Browse', saveConfig: 'Save Config', generatedPoints: 'Generated Points', usedDevice: 'Used Device', downloadModel: 'Download PLY Model', generating3d: 'Generating 3D model...', axes: 'Axes', grid: 'Grid', none: 'None', vertical: 'Vertical', horizontal: 'Horizontal', depth: 'Depth', xoyPlane: 'XOY Plane (Z-axis vertical)', xozPlane: 'XOZ Plane (Y-axis vertical)', yozPlane: 'YOZ Plane (X-axis vertical)', auto: 'Auto (Browser)', defaultDevice: 'Auto (Default)', importPLY: 'Import PLY', downloadHint: 'Saved to: backend/outputs/', pathPlaceholder: 'path...', unavailable: 'unavailable', imageMode: 'Image Mode', plyMode: 'PLY Mode', navigation: 'Navigation', rotate: 'Rotate', drag: 'Drag', zoom: 'Zoom', scroll: 'Scroll', save: 'Save', reset: 'Reset', front: 'Front', left: 'Left', right: 'Right', top: 'Top', display: 'Display', allUI: 'All UI', pressEscToShow: 'Press ESC to show UI', audioVisualization: 'Audio Visualization', importAudio: 'Import Audio', play: 'Play', pause: 'Pause', pulse: 'Pulse', wave: 'Wave', explode: 'Explode' },
      zh: { selectImage: '选图', generate: '生成', generating: '生成中', pointSize: '点大小', modelScale: '模型缩放', maxPoints: '点数上限', effects: '特效模式', effectDirection: '特效方向', imagePlane: '图像平面', resetAnim: '重玩动画', advancedSettings: '高级设置', modelPath: '模型路径', device: '计算设备', checkpointOverride: 'Checkpoint 覆盖 (可选)', browse: '浏览', saveConfig: '保存配置', generatedPoints: '生成点数', usedDevice: '使用设备', downloadModel: '下载 PLY 模型', generating3d: '正在生成3D模型...', axes: '坐标轴', grid: '网格', none: '无特效', vertical: '垂直', horizontal: '水平', depth: '纵深', xoyPlane: 'XOY平面 (Z轴垂直)', xozPlane: 'XOZ平面 (Y轴垂直)', yozPlane: 'YOZ平面 (X轴垂直)', auto: '自动 (浏览器)', defaultDevice: '自动 (默认)', importPLY: '导入 PLY', downloadHint: '保存位置: backend/outputs/', pathPlaceholder: '路径...', unavailable: '不可用', imageMode: '图片模式', plyMode: 'PLY模式', navigation: '导航', rotate: '旋转', drag: '拖动', zoom: '缩放', scroll: '滚轮', save: '保存', reset: '重置', front: '正面', left: '左视图', right: '右视图', top: '俯视图', display: '显示', allUI: '所有界面', pressEscToShow: '按 ESC 显示界面', audioVisualization: '音乐可视化', importAudio: '导入音频', play: '播放', pause: '暂停', pulse: '脉冲', wave: '波浪', explode: '爆炸' },
      fr: { selectImage: 'Sélectionner', generate: 'Générer', generating: 'Génération', pointSize: 'Taille des points', modelScale: 'Échelle du modèle', maxPoints: 'Points max', effects: 'Effets', effectDirection: 'Direction effet', imagePlane: 'Plan image', resetAnim: 'Réinitialiser animation', advancedSettings: 'Paramètres avancés', modelPath: 'Chemin du modèle', device: 'Appareil', checkpointOverride: 'Remplacement checkpoint (Optionnel)', browse: 'Parcourir', saveConfig: 'Sauvegarder config', generatedPoints: 'Points générés', usedDevice: 'Appareil utilisé', downloadModel: 'Télécharger modèle PLY', generating3d: 'Génération du modèle 3D...', axes: 'Axes', grid: 'Grille', none: 'Aucun', vertical: 'Vertical', horizontal: 'Horizontal', depth: 'Profondeur', xoyPlane: 'Plan XOY (Z vertical)', xozPlane: 'Plan XOZ (Y vertical)', yozPlane: 'Plan YOZ (X vertical)', auto: 'Auto (Navigateur)', defaultDevice: 'Auto (Défaut)', unavailable: 'indisponible', imageMode: 'Mode Image', plyMode: 'Mode PLY', navigation: 'Navigation', rotate: 'Rotation', drag: 'Glisser', zoom: 'Zoom', scroll: 'Défiler', save: 'Sauvegarder', reset: 'Réinitialiser', front: 'Avant', left: 'Gauche', right: 'Droite', top: 'Haut', display: 'Affichage', allUI: 'Toute interface', pressEscToShow: 'Appuyez sur ESC pour afficher' },
      de: { selectImage: 'Auswählen', generate: 'Generieren', generating: 'Generierung', pointSize: 'Punktgröße', modelScale: 'Modellskalierung', maxPoints: 'Max Punkte', effects: 'Effekte', effectDirection: 'Effektrichtung', imagePlane: 'Bildebene', resetAnim: 'Animation zurücksetzen', advancedSettings: 'Erweiterte Einstellungen', modelPath: 'Modellpfad', device: 'Gerät', checkpointOverride: 'Checkpoint-Override (Optional)', browse: 'Durchsuchen', saveConfig: 'Konfiguration speichern', generatedPoints: 'Generierte Punkte', usedDevice: 'Verwendetes Gerät', downloadModel: 'PLY-Modell herunterladen', generating3d: '3D-Modell wird generiert...', axes: 'Achsen', grid: 'Raster', none: 'Keine', vertical: 'Vertikal', horizontal: 'Horizontal', depth: 'Tiefe', xoyPlane: 'XOY-Ebene (Z vertikal)', xozPlane: 'XOZ-Ebene (Y vertikal)', yozPlane: 'YOZ-Ebene (X vertikal)', auto: 'Auto (Browser)', defaultDevice: 'Auto (Standard)', unavailable: 'nicht verfügbar', imageMode: 'Bildmodus', plyMode: 'PLY-Modus', navigation: 'Navigation', rotate: 'Drehen', drag: 'Ziehen', zoom: 'Zoom', scroll: 'Scrollen', save: 'Speichern', reset: 'Zurücksetzen', front: 'Vorne', left: 'Links', right: 'Rechts', top: 'Oben', display: 'Anzeige', allUI: 'Alle UI', pressEscToShow: 'ESC drücken zum Anzeigen' },
      it: { selectImage: 'Seleziona', generate: 'Genera', generating: 'Generazione', pointSize: 'Dimensione punti', modelScale: 'Scala modello', maxPoints: 'Punti max', effects: 'Effetti', effectDirection: 'Direzione effetto', imagePlane: 'Piano immagine', resetAnim: 'Ripristina animazione', advancedSettings: 'Impostazioni avanzate', modelPath: 'Percorso modello', device: 'Dispositivo', checkpointOverride: 'Override checkpoint (Opzionale)', browse: 'Sfoglia', saveConfig: 'Salva configurazione', generatedPoints: 'Punti generati', usedDevice: 'Dispositivo utilizzato', downloadModel: 'Scarica modello PLY', generating3d: 'Generazione modello 3D...', axes: 'Assi', grid: 'Griglia', none: 'Nessuno', vertical: 'Verticale', horizontal: 'Orizzontale', depth: 'Profondità', xoyPlane: 'Piano XOY (Z verticale)', xozPlane: 'Piano XOZ (Y verticale)', yozPlane: 'Piano YOZ (X verticale)', auto: 'Auto (Browser)', defaultDevice: 'Auto (Predefinito)', unavailable: 'non disponibile', imageMode: 'Modalità Immagine', plyMode: 'Modalità PLY', navigation: 'Navigazione', rotate: 'Ruota', drag: 'Trascina', zoom: 'Zoom', scroll: 'Scorri', save: 'Salva', reset: 'Ripristina', front: 'Fronte', left: 'Sinistra', right: 'Destra', top: 'Alto', display: 'Visualizza', allUI: 'Tutta UI', pressEscToShow: 'Premi ESC per mostrare' },
      es: { selectImage: 'Seleccionar', generate: 'Generar', generating: 'Generando', pointSize: 'Tamaño de punto', modelScale: 'Escala del modelo', maxPoints: 'Puntos máx', effects: 'Efectos', effectDirection: 'Dirección efecto', imagePlane: 'Plano imagen', resetAnim: 'Reiniciar animación', advancedSettings: 'Configuración avanzada', modelPath: 'Ruta del modelo', device: 'Dispositivo', checkpointOverride: 'Anulación checkpoint (Opcional)', browse: 'Examinar', saveConfig: 'Guardar configuración', generatedPoints: 'Puntos generados', usedDevice: 'Dispositivo usado', downloadModel: 'Descargar modelo PLY', generating3d: 'Generando modelo 3D...', axes: 'Ejes', grid: 'Cuadrícula', none: 'Ninguno', vertical: 'Vertical', horizontal: 'Horizontal', depth: 'Profundidad', xoyPlane: 'Plano XOY (Z vertical)', xozPlane: 'Plano XOZ (Y vertical)', yozPlane: 'Plano YOZ (X vertical)', auto: 'Auto (Navegador)', defaultDevice: 'Auto (Predeterminado)', unavailable: 'no disponible', imageMode: 'Modo Imagen', plyMode: 'Modo PLY', navigation: 'Navegación', rotate: 'Rotar', drag: 'Arrastrar', zoom: 'Zoom', scroll: 'Desplazar', save: 'Guardar', reset: 'Restablecer', front: 'Frente', left: 'Izquierda', right: 'Derecha', top: 'Arriba', display: 'Mostrar', allUI: 'Toda interfaz', pressEscToShow: 'Presione ESC para mostrar' },
      ja: { selectImage: '選択', generate: '生成', generating: '生成中', pointSize: 'ポイントサイズ', modelScale: 'モデルスケール', maxPoints: '最大ポイント', effects: 'エフェクト', effectDirection: 'エフェクト方向', imagePlane: '画像平面', resetAnim: 'アニメーションリセット', advancedSettings: '詳細設定', modelPath: 'モデルパス', device: 'デバイス', checkpointOverride: 'チェックポイント上書き（オプション）', browse: '参照', saveConfig: '設定保存', generatedPoints: '生成ポイント', usedDevice: '使用デバイス', downloadModel: 'PLYモデルダウンロード', generating3d: '3Dモデル生成中...', axes: '軸', grid: 'グリッド', none: 'なし', vertical: '垂直', horizontal: '水平', depth: '奥行き', xoyPlane: 'XOY平面 (Z軸垂直)', xozPlane: 'XOZ平面 (Y軸垂直)', yozPlane: 'YOZ平面 (X軸垂直)', auto: '自動 (ブラウザ)', defaultDevice: '自動 (デフォルト)', unavailable: '利用不可', imageMode: '画像モード', plyMode: 'PLYモード', navigation: 'ナビゲーション', rotate: '回転', drag: 'ドラッグ', zoom: 'ズーム', scroll: 'スクロール', save: '保存', reset: 'リセット', front: '正面', left: '左', right: '右', top: '上', display: '表示', allUI: '全UI', pressEscToShow: 'ESCキーで表示' },
      ko: { selectImage: '선택', generate: '생성', generating: '생성 중', pointSize: '포인트 크기', modelScale: '모델 스케일', maxPoints: '최대 포인트', effects: '효과', effectDirection: '효과 방향', imagePlane: '이미지 평면', resetAnim: '애니메이션 재설정', advancedSettings: '고급 설정', modelPath: '모델 경로', device: '장치', checkpointOverride: '체크포인트 재정의 (선택사항)', browse: '찾아보기', saveConfig: '설정 저장', generatedPoints: '생성된 포인트', usedDevice: '사용된 장치', downloadModel: 'PLY 모델 다운로드', generating3d: '3D 모델 생성 중...', axes: '축', grid: '격자', none: '없음', vertical: '수직', horizontal: '수평', depth: '깊이', xoyPlane: 'XOY 평면 (Z축 수직)', xozPlane: 'XOZ 평면 (Y축 수직)', yozPlane: 'YOZ 평면 (X축 수직)', auto: '자동 (브라우저)', defaultDevice: '자동 (기본값)', unavailable: '사용 불가', imageMode: '이미지 모드', plyMode: 'PLY 모드', navigation: '내비게이션', rotate: '회전', drag: '드래그', zoom: '줌', scroll: '스크롤', save: '저장', reset: '재설정', front: '정면', left: '왼쪽', right: '오른쪽', top: '위', display: '표시', allUI: '모든 UI', pressEscToShow: 'ESC를 눌러 표시' }
    }
    return translations[lang]?.[key] || translations.en[key] || key
  }

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      setModelPath(cfg.model_path ?? modelPath)
      setDevice(cfg.device ?? device)
    }).catch(() => {})
    
    // Fetch device availability
    fetch('/api/health').then(r => r.json()).then(health => {
      setDeviceAvailability({
        cuda: health.cuda_available ?? false,
        mps: health.mps_available ?? false
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setFilePreview(null)
    }
  }, [file])

  // ESC key listener to restore UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAllUI) {
        setShowAllUI(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAllUI])

  // Audio visualization
  useEffect(() => {
    isPlayingRef.current = isPlaying
    
    if (!audioFile || audioVisualization === 'none') {
      // Smooth fade out when stopping
      let currentData = {...audioData}
      const fadeOut = () => {
        const decayFactor = 0.92
        currentData = {
          bass: currentData.bass * decayFactor,
          mid: currentData.mid * decayFactor,
          high: currentData.high * decayFactor
        }
        if (currentData.bass > 0.001 || currentData.mid > 0.001 || currentData.high > 0.001) {
          setAudioData(currentData)
          requestAnimationFrame(fadeOut)
        } else {
          setAudioData({bass: 0, mid: 0, high: 0})
        }
      }
      if (audioData.bass > 0 || audioData.mid > 0 || audioData.high > 0) {
        fadeOut()
      }
      if (!isPlaying) return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const audioElement = new Audio()
    audioElement.src = URL.createObjectURL(audioFile)
    const source = audioContext.createMediaElementSource(audioElement)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    const updateAudioData = () => {
      if (!isPlayingRef.current) {
        // Smooth fade out instead of immediate stop
        setAudioData(prev => {
          const decayFactor = 0.92
          const newData = {
            bass: prev.bass * decayFactor,
            mid: prev.mid * decayFactor,
            high: prev.high * decayFactor
          }
          if (newData.bass > 0.001 || newData.mid > 0.001 || newData.high > 0.001) {
            requestAnimationFrame(updateAudioData)
          }
          return newData
        })
        return
      }
      
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate bass (low frequencies), mid, and high
      const bass = dataArray.slice(0, bufferLength / 4).reduce((a, b) => a + b, 0) / (bufferLength / 4) / 255
      const mid = dataArray.slice(bufferLength / 4, bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength / 4) / 255
      const high = dataArray.slice(bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength / 2) / 255
      
      setAudioData({bass, mid, high})
      
      if (isPlayingRef.current) {
        requestAnimationFrame(updateAudioData)
      }
    }

    audioElement.addEventListener('ended', () => {
      isPlayingRef.current = false
      setIsPlaying(false)
      // Don't immediately set to zero, let the decay animation handle it
    })

    if (isPlaying) {
      audioElement.play()
      updateAudioData()
    } else {
      audioElement.pause()
    }

    return () => {
      audioElement.pause()
      audioContext.close()
      URL.revokeObjectURL(audioElement.src)
    }
  }, [audioFile, isPlaying, audioVisualization])

  // Show ESC hint when UI is hidden, auto-hide after 2 seconds
  useEffect(() => {
    if (!showAllUI) {
      setShowEscHint(true)
      const timer = setTimeout(() => {
        setShowEscHint(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showAllUI])

  const handleConfigSave = async () => {
    // Validate device availability
    if (deviceAvailability) {
      if (device === 'cuda' && !deviceAvailability.cuda) {
        const msg = language === 'zh' 
          ? 'CUDA 不可用，此设备没有 NVIDIA GPU。建议选择 "Auto (Default)" 或 "CPU"。'
          : 'CUDA is not available on this device (no NVIDIA GPU detected). Please select "Auto (Default)" or "CPU".';
        if (!confirm(msg + '\n\n' + (language === 'zh' ? '是否仍要保存此配置？' : 'Do you still want to save this configuration?'))) {
          return;
        }
      }
      if (device === 'mps' && !deviceAvailability.mps) {
        const msg = language === 'zh'
          ? 'Apple MPS 不可用，此设备可能不是 Apple Silicon Mac。建议选择 "Auto (Default)" 或 "CPU"。'
          : 'Apple MPS is not available on this device (not an Apple Silicon Mac). Please select "Auto (Default)" or "CPU".';
        if (!confirm(msg + '\n\n' + (language === 'zh' ? '是否仍要保存此配置？' : 'Do you still want to save this configuration?'))) {
          return;
        }
      }
    }
    
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_path: modelPath, device })
    })
    
    // Close settings panel instead of showing alert
    setShowSettings(false);
  }

  const handleBrowse = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pth,.ckpt'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) setOverrideCkpt(file.name)
    }
    input.click()
  }

  const handleBrowseModelPath = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const path = files[0].webkitRelativePath.split('/')[0]
        setModelPath(path)
      }
    }
    input.click()
  }

  const handleImportPLY = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ply'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setBusy(true)
        setFilePreview(null)
        setFile(null)
        
        // Simulate loading delay to show animation
        setTimeout(() => {
          const url = URL.createObjectURL(file)
          setResult({
            positions: [],
            colors: [],
            sizes: [],
            opacities: [],
            ply_url: url,
            count: 0,
            device: 'imported'
          })
          setBusy(false)
        }, 500)
      }
    }
    input.click()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setFile(file)
      }
    }
  }

  const handleDeleteImage = () => {
    setFile(null)
    setFilePreview(null)
    setResult(null)
  }

  const handlePredict = async () => {
    if (!file) return
    setBusy(true)
    setResult(null)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('max_points', String(maxPoints))
    if (overrideCkpt.trim()) fd.append('checkpoint_path', overrideCkpt.trim())

    try {
      const resp = await fetch('/api/predict', { method: 'POST', body: fd })
      const data = await resp.json()
      console.log('[App] Prediction result:', data)
      
      // Log performance info if available
      if (data.timing) {
        console.log('[App] Performance:', {
          inference: `${data.timing.inference.toFixed(2)}s`,
          total: `${data.timing.total.toFixed(2)}s`,
          device: data.device
        })
      }
      
      setResult(data)
    } catch (e) {
      console.error('[App] Prediction error:', e)
      alert('预测失败，请检查后端日志。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div 
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#111' }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {busy && <LoadingOverlay t={t} />}
      <GaussianViewer 
        data={result} 
        pointScale={pointScale} 
        modelScale={modelScale} 
        effect={effect}
        effectDirection={effectDirection}
        resetAnimTrigger={resetAnim}
        showAxes={showAxes}
        showGrid={showGrid}
        cameraViewTrigger={cameraViewTrigger}
        audioData={audioData}
        audioVisualization={audioVisualization}
      />

      {/* Top Right Controls */}
      {showAllUI && (
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10, zIndex: 20, alignItems: 'center' }}>
          <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...selectStyle, width: '120px', padding: '6px 8px', height: '32px', lineHeight: '20px' }}>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="es">Español</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
          <a href="https://github.com/EuanTop/ml-sharp-gui" target="_blank" rel="noopener noreferrer" style={{ display: 'flex' }}>
            <img src="/github.svg" width="28" height="28" alt="GitHub" />
          </a>
        </div>
      )}

      {/* Navigation Panel */}
      {showAllUI && (
        <div style={{
        position: 'absolute',
        top: 70,
        right: 20,
        background: 'rgba(20, 20, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 8,
        padding: '12px 16px',
        color: '#eee',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 156
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '0.5px' }}>
          {t('navigation').toUpperCase()}
        </div>
        
        {/* Controls Hints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, fontSize: 10, color: '#aaa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('rotate')}</span>
            <span style={{ color: '#ddd', fontWeight: 600 }}>{t('drag')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('zoom')}</span>
            <span style={{ color: '#ddd', fontWeight: 600 }}>{t('scroll')}</span>
          </div>
        </div>

        {/* View Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button 
            onClick={() => setCameraViewTrigger({view: 'front', timestamp: Date.now()})} 
            style={{ ...btnStyle, padding: '8px', fontSize: 11, background: '#333', border: '1px solid #444', width: '100%' }}
          >
            {t('front')}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button 
              onClick={() => setCameraViewTrigger({view: 'left', timestamp: Date.now()})} 
              style={{ ...btnStyle, padding: '8px', fontSize: 11, background: '#333', border: '1px solid #444' }}
            >
              {t('left')}
            </button>
            <button 
              onClick={() => setCameraViewTrigger({view: 'right', timestamp: Date.now()})} 
              style={{ ...btnStyle, padding: '8px', fontSize: 11, background: '#333', border: '1px solid #444' }}
            >
              {t('right')}
            </button>
          </div>

          <button 
            onClick={() => setCameraViewTrigger({view: 'top', timestamp: Date.now()})} 
            style={{ ...btnStyle, padding: '8px', fontSize: 11, background: '#333', border: '1px solid #444', width: '100%' }}
          >
            {t('top')}
          </button>
        </div>

        {/* Display Controls */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '0.5px' }}>
          {t('display').toUpperCase()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 10, color: '#ccc' }}>
            <input 
              type="checkbox" 
              checked={showAxes} 
              onChange={e => setShowAxes(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('axes')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 10, color: '#ccc' }}>
            <input 
              type="checkbox" 
              checked={showGrid} 
              onChange={e => setShowGrid(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('grid')}
          </label>
          <button
            onClick={() => setShowAllUI(false)}
            style={{ ...btnStyle, width: '100%', padding: '6px 8px', fontSize: 10, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #444', marginTop: 4 }}
          >
            {t('allUI')}
          </button>
        </div>
      </div>
      )}

      {/* Main Control Panel */}
      {showAllUI && (
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(16px)',
          borderRadius: 12,
          padding: '20px',
          color: '#eee',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 280,
          zIndex: 10,
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Header / Title */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', marginBottom: 4, fontFamily: 'Merriweather, Georgia, serif' }}>
          SHARP 3D GENERATOR
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: 4, background: '#222', borderRadius: 6, padding: 4 }}>
          <button 
            onClick={() => setInputMode('image')} 
            style={{ 
              ...btnStyle, 
              flex: 1, 
              background: inputMode === 'image' ? '#fff' : 'transparent', 
              color: inputMode === 'image' ? '#000' : '#888',
              border: 'none',
              padding: '8px'
            }}
          >
            {t('imageMode')}
          </button>
          <button 
            onClick={() => setInputMode('ply')} 
            style={{ 
              ...btnStyle, 
              flex: 1, 
              background: inputMode === 'ply' ? '#fff' : 'transparent', 
              color: inputMode === 'ply' ? '#000' : '#888',
              border: 'none',
              padding: '8px'
            }}
          >
            {t('plyMode')}
          </button>
        </div>

        {/* Image Mode UI */}
        {inputMode === 'image' && (
          <>
            {/* Image Preview or Drop Zone */}
            <div style={{ 
              width: '100%', 
              height: 120, 
              borderRadius: 8, 
              border: isDragging ? '2px dashed #fff' : '1px dashed #444', 
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDragging ? 'rgba(255,255,255,0.05)' : '#000',
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              {filePreview ? (
                <>
                  <img src={filePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={handleDeleteImage}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: 'none',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      lineHeight: 1,
                      padding: 0,
                      backdropFilter: 'blur(4px)'
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </>
              ) : (
                <label style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20, cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDragging ? '📷 Drop image here' : '📷 Drag image here or click to select'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            {/* Max Points */}
            <div>
              <div style={labelStyle}>{t('maxPoints')}</div>
              <input type="number" value={maxPoints} onChange={e => setMaxPoints(parseInt(e.target.value || '120000'))} step={10000} style={inputStyle} />
            </div>

            {/* Generate Button */}
            <button onClick={() => handlePredict()} disabled={!file || busy} style={{ ...btnStyle, background: busy ? '#444' : '#fff', color: busy ? '#888' : '#000', width: '100%' }}>
              {busy ? t('generating') : t('generate')}
            </button>
          </>
        )}

        {/* PLY Mode UI */}
        {inputMode === 'ply' && (
          <button onClick={handleImportPLY} disabled={busy} style={{ ...btnStyle, background: busy ? '#444' : '#fff', color: busy ? '#888' : '#000', width: '100%', padding: '16px' }}>
            {t('importPLY')}
          </button>
        )}

        {/* Download Button (if result exists) */}
        {result?.ply_url && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a 
              href={result.ply_url} 
              download
              style={{ 
                ...btnStyle, 
                background: '#222', 
                border: '1px solid #333', 
                textDecoration: 'none',
                fontSize: 12,
                padding: '8px'
              }}
            >
              {t('downloadModel')}
            </a>
            <div style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
              {t('downloadHint')}
            </div>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Point Size */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={labelStyle}>{t('pointSize')}</div>
              <div onClick={() => setPointScale(80)} style={{ cursor: 'pointer', opacity: 0.6, display: 'flex' }} title="重置">
                <ResetIcon />
              </div>
            </div>
            <input type="range" min={20} max={240} step={5} value={pointScale} onChange={e => setPointScale(parseInt(e.target.value))} style={rangeStyle} />
          </div>

          {/* Model Scale */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={labelStyle}>{t('modelScale')}</div>
              <div onClick={() => setModelScale(2.5)} style={{ cursor: 'pointer', opacity: 0.6, display: 'flex' }} title="重置">
                <ResetIcon />
              </div>
            </div>
            <input type="range" min={0.5} max={5.0} step={0.1} value={modelScale} onChange={e => setModelScale(parseFloat(e.target.value))} style={rangeStyle} />
          </div>

          {/* Effects */}
          <div>
            <div style={labelStyle}>{t('effects')}</div>
            <select 
              value={effect} 
              onChange={(e) => setEffect(e.target.value as EffectType)}
              style={selectStyle}
            >
              <option value="None">{t('none')}</option>
              <option value="Magic">Magic Reveal</option>
              <option value="Spread">Spread Reveal</option>
              <option value="Unroll">Unroll Reveal</option>
              <option value="Twister">Twister Weather</option>
              <option value="Rain">Rain Weather</option>
            </select>
          </div>

          {effect !== 'None' && (
            <div>
              <div style={labelStyle}>{t('effectDirection')}</div>
              <select 
                value={effectDirection} 
                onChange={(e) => setEffectDirection(e.target.value as any)}
                style={selectStyle}
              >
                <option value="Y">{t('vertical')} (Y)</option>
                <option value="X">{t('horizontal')} (X)</option>
                <option value="Z">{t('depth')} (Z)</option>
              </select>
            </div>
          )}

          {effect !== 'None' && (
            <button onClick={() => setResetAnim(prev => prev + 1)} style={{ ...btnStyle, background: '#222', border: '1px solid #333', fontSize: 12, padding: '8px' }}>
              {t('resetAnim')}
            </button>
          )}

          {/* Audio Visualization Controls */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <div style={labelStyle}>{t('audioVisualization')}</div>
          
          <div style={{ display: 'flex', gap: 6 }}>
            <label style={{ ...btnStyle, background: '#222', border: '1px solid #333', fontSize: 11, padding: '8px', flex: 1, cursor: 'pointer' }}>
              {t('importAudio')}
              <input 
                type="file" 
                accept="audio/*" 
                style={{ display: 'none' }} 
                onChange={e => setAudioFile(e.target.files?.[0] ?? null)} 
              />
            </label>
            {audioFile && (
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                style={{ ...btnStyle, background: isPlaying ? '#c33' : '#3c3', border: '1px solid #444', fontSize: 11, padding: '8px', flex: 1 }}
              >
                {isPlaying ? t('pause') : t('play')}
              </button>
            )}
          </div>

          {audioFile && (
            <select 
              value={audioVisualization} 
              onChange={(e) => setAudioVisualization(e.target.value as any)}
              style={selectStyle}
            >
              <option value="none">{t('none')}</option>
              <option value="pulse">{t('pulse')}</option>
              <option value="wave">{t('wave')}</option>
              <option value="explode">{t('explode')}</option>
            </select>
          )}
        </div>
      </div>
      )}

      {/* Settings Toggle */}
      {showAllUI && (
        <div 
          onClick={() => setShowSettings(!showSettings)}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: 'rgba(20,20,20,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            zIndex: 20
          }}
        >
          <SettingsIcon />
        </div>
      )}

      {/* Settings Panel (Bottom Right) */}
      {showAllUI && showSettings && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            right: 20,
            background: 'rgba(20,20,20,0.9)',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: 260,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            zIndex: 19
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{t('advancedSettings')}</div>
          
          <div>
            <div style={labelStyle}>{t('modelPath')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={modelPath} readOnly style={{ ...inputStyle, width: 'auto', flex: 1, cursor: 'not-allowed', opacity: 0.7, minWidth: 0 }} />
              <button onClick={handleBrowseModelPath} style={{ ...btnStyle, padding: '0 10px', background: '#333', border: '1px solid #444', fontSize: 11, whiteSpace: 'nowrap', height: '36px', flexShrink: 0 }}>
                {t('browse')}
              </button>
            </div>
          </div>
          
          <div>
            <div style={labelStyle}>{t('device')}</div>
            <select value={device} onChange={e => setDevice(e.target.value)} style={selectStyle}>
              <option value="default">{t('defaultDevice')}</option>
              <option value="cuda" disabled={!!deviceAvailability && !deviceAvailability.cuda}>CUDA{deviceAvailability && !deviceAvailability.cuda ? ` (${t('unavailable')})` : ''}</option>
              <option value="mps" disabled={!!deviceAvailability && !deviceAvailability.mps}>Apple MPS{deviceAvailability && !deviceAvailability.mps ? ` (${t('unavailable')})` : ''}</option>
              <option value="cpu">CPU</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>{t('checkpointOverride')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={overrideCkpt} readOnly placeholder={t('pathPlaceholder')} style={{ ...inputStyle, width: 'auto', flex: 1, cursor: 'not-allowed', opacity: 0.7, minWidth: 0 }} />
              <button onClick={handleBrowse} style={{ ...btnStyle, padding: '0 10px', background: '#333', border: '1px solid #444', fontSize: 11, whiteSpace: 'nowrap', height: '36px', flexShrink: 0 }}>
                {t('browse')}
              </button>
            </div>
          </div>

          <button onClick={handleConfigSave} style={{ ...btnStyle, background: '#333', border: '1px solid #444', marginTop: 4 }}>
            {t('saveConfig')}
          </button>

          {result && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#888', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('generatedPoints')}:</span> <span style={{ color: '#fff' }}>{result.count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('usedDevice')}:</span> <span style={{ color: '#fff' }}>{result.device}</span>
              </div>
              {result.ply_url && (
                <a href={result.ply_url} target="_blank" style={{ color: '#fff', textDecoration: 'underline', marginTop: 4 }}>{t('downloadModel')}</a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ESC Hint Overlay */}
      {!showAllUI && showEscHint && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.85)',
          padding: '24px 48px',
          borderRadius: 12,
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          zIndex: 10000,
          pointerEvents: 'none',
          border: '2px solid rgba(255,255,255,0.2)',
          animation: 'fadeOut 2s ease-in-out forwards'
        }}>
          {t('pressEscToShow')}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#888',
  marginBottom: 6,
  fontWeight: 500,
  textTransform: 'uppercase',
  boxSizing: 'border-box',
  letterSpacing: '0.5px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: '36px',
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  display: 'block',
  margin: 0,
  lineHeight: '34px' // height - 2px border
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer'
}

const rangeStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#fff'
}
