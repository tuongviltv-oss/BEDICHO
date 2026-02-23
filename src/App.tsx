/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  Timer, 
  Volume2, 
  VolumeX, 
  Lightbulb,
  ArrowRight,
  Star,
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
interface Question {
  id: number;
  text: string;
  options: string[];
  answer: string;
  hint: string;
  reward: string;
  rewardIcon: string;
}

// --- Constants ---
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Một túi bánh giá 18 000 đồng và một chai sữa giá 12 000 đồng. Hỏi phải trả tất cả bao nhiêu tiền?",
    options: ["28 000", "29 000", "30 000", "31 000"],
    answer: "30 000",
    hint: "Hãy cộng 18 000 và 12 000.",
    reward: "Xe điều khiển từ xa siêu tốc",
    rewardIcon: "🚗"
  },
  {
    id: 2,
    text: "Một quyển truyện giá 32 000 đồng. Bé đưa 50 000 đồng. Hỏi được trả lại bao nhiêu tiền?",
    options: ["16 000", "17 000", "18 000", "19 000"],
    answer: "18 000",
    hint: "Lấy 50 000 trừ 32 000.",
    reward: "Máy chơi game mini",
    rewardIcon: "🎮"
  },
  {
    id: 3,
    text: "Lan có 60 000 đồng. Lan mua hộp sữa 22 000 đồng và túi bánh 15 000 đồng. Hỏi còn lại bao nhiêu tiền?",
    options: ["21 000", "22 000", "23 000", "24 000"],
    answer: "23 000",
    hint: "Bước 1: Lấy 22 000 + 15 000. Bước 2: Lấy 60 000 - số tiền vừa tìm được.",
    reward: "Gấu bông khổng lồ phát nhạc",
    rewardIcon: "🧸"
  },
  {
    id: 4,
    text: "Nam có 80 000 đồng. Nam mua cặp 45 000 đồng và bút màu 18 000 đồng. Hỏi còn lại bao nhiêu tiền?",
    options: ["15 000", "16 000", "17 000", "18 000"],
    answer: "17 000",
    hint: "Bước 1: 45 000 + 18 000. Bước 2: 80 000 - số tiền vừa tìm được.",
    reward: "Xe scooter phát sáng",
    rewardIcon: "🛴"
  },
  {
    id: 5,
    text: "Mai có 70 000 đồng. Mai mua váy 42 000 đồng và một chiếc nón. Sau khi mua xong còn lại 8 000 đồng. Hỏi chiếc nón giá bao nhiêu tiền?",
    options: ["18 000", "19 000", "20 000", "21 000"],
    answer: "20 000",
    hint: "Bước 1: 70 000 - 8 000. Bước 2: Lấy số tiền đó - 42 000.",
    reward: "Hộp quà bí mật phát sáng",
    rewardIcon: "🎉"
  }
];

const SOUNDS = {
  bg: 'https://assets.mixkit.co/music/preview/mixkit-soft-piano-100.mp3',
  correct: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-reward-952.mp3',
  wrong: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
  win: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
  tick: 'https://assets.mixkit.co/sfx/preview/mixkit-clock-countdown-bleeps-916.mp3',
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3'
};

export default function App() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'END'>('START');
  const [userInfo, setUserInfo] = useState({ name: '', class: '' });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [collectedItems, setCollectedItems] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [animatingItem, setAnimatingItem] = useState<{ icon: string; id: number } | null>(null);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [shake, setShake] = useState(false);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sounds
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      if (key === 'bg') {
        audio.loop = true;
        bgMusicRef.current = audio;
      }
      audioRefs.current[key] = audio;
    });
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
      if (gameState === 'PLAYING' && !isMuted) {
        bgMusicRef.current.play().catch(() => {});
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [gameState, isMuted]);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (isMuted) return;
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING' && timer > 0 && !feedback) {
      interval = window.setInterval(() => {
        setTimer((prev) => {
          if (prev <= 4 && prev > 1) playSound('tick');
          return prev - 1;
        });
      }, 1000);
    } else if (timer === 0 && gameState === 'PLAYING' && !feedback) {
      handleWrong();
    }
    return () => clearInterval(interval);
  }, [gameState, timer, feedback]);

  const handleStart = () => {
    if (!userInfo.name.trim()) return;
    setGameState('PLAYING');
    setCurrentIdx(0);
    setScore(0);
    setTimer(30);
    setAttempts(0);
    setShowHint(false);
    setCollectedItems([]);
  };

  const handleCorrect = () => {
    const points = attempts === 0 ? 10 : 5;
    setScore(prev => prev + points);
    setFeedback('CORRECT');
    playSound('correct');
    
    // Animate item to cart
    setAnimatingItem({ icon: QUESTIONS[currentIdx].rewardIcon, id: Date.now() });
    setCollectedItems(prev => [...prev, QUESTIONS[currentIdx].rewardIcon]);

    if (currentIdx === 4) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00']
      });
    }

    setTimeout(() => {
      if (currentIdx < 4) {
        setCurrentIdx(prev => prev + 1);
        setTimer(30);
        setAttempts(0);
        setShowHint(false);
        setFeedback(null);
      } else {
        setGameState('END');
        playSound('win');
      }
    }, 2000);
  };

  const handleWrong = () => {
    playSound('wrong');
    setFeedback('WRONG');
    
    if (attempts === 0) {
      setShowHint(true);
      setTimeout(() => {
        setAttempts(1);
        setFeedback(null);
        setTimer(30);
      }, 1500);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        if (currentIdx < 4) {
          setCurrentIdx(prev => prev + 1);
          setTimer(30);
          setAttempts(0);
          setShowHint(false);
          setFeedback(null);
        } else {
          setGameState('END');
          playSound('win');
        }
      }, 1500);
    }
  };

  const onAnswer = (option: string) => {
    if (feedback) return;
    playSound('click');
    if (option === QUESTIONS[currentIdx].answer) {
      handleCorrect();
    } else {
      handleWrong();
    }
  };

  const getTitle = (s: number) => {
    if (s >= 50) return { text: "👑 Siêu khách hàng vàng", color: "text-yellow-600" };
    if (s >= 30) return { text: "🌟 Người mua hàng thông minh", color: "text-orange-600" };
    return { text: "💪 Cố gắng thêm nhé", color: "text-blue-600" };
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] font-sans text-stone-800 overflow-hidden selection:bg-orange-200">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-pink-400 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-300 rounded-full blur-[100px]" />
      </div>

      {/* Sound Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-4 right-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        {isMuted ? <VolumeX className="text-red-500" /> : <Volume2 className="text-green-600" />}
      </button>

      <AnimatePresence mode="wait">
        {gameState === 'START' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="bg-white p-8 rounded-[40px] shadow-2xl border-8 border-orange-400 max-w-md w-full text-center space-y-6">
              <motion.h1 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-4xl font-black text-orange-500 tracking-tight"
              >
                🌟 BÉ ĐI SIÊU THỊ 🌟
              </motion.h1>
              
              <div className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-bold text-stone-500 mb-1 ml-2">Tên của bé:</label>
                  <input 
                    type="text" 
                    value={userInfo.name}
                    onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                    placeholder="Nhập tên bé..."
                    className="w-full px-6 py-4 bg-stone-100 rounded-2xl border-2 border-transparent focus:border-orange-400 outline-none transition-all text-lg font-bold"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-sm font-bold text-stone-500 mb-1 ml-2">Lớp của bé:</label>
                  <input 
                    type="text" 
                    value={userInfo.class}
                    onChange={(e) => setUserInfo({ ...userInfo, class: e.target.value })}
                    placeholder="Nhập lớp bé..."
                    className="w-full px-6 py-4 bg-stone-100 rounded-2xl border-2 border-transparent focus:border-orange-400 outline-none transition-all text-lg font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={handleStart}
                disabled={!userInfo.name.trim()}
                className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white rounded-2xl text-2xl font-black shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                BẮT ĐẦU CHƠI <ArrowRight size={28} />
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`relative z-10 flex flex-col min-h-screen p-4 md:p-8 ${shake ? 'animate-shake' : ''}`}
          >
            {/* Header Info */}
            <div className="flex justify-between items-center mb-6">
              <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-md border-b-4 border-green-500 flex items-center gap-3">
                <Trophy className="text-yellow-500" />
                <span className="text-2xl font-black text-green-600">{score}</span>
              </div>
              
              <div className="flex-1 max-w-xs mx-4">
                <div className="h-4 bg-stone-200 rounded-full overflow-hidden border-2 border-white shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx + 1) / 5) * 100}%` }}
                    className="h-full bg-gradient-to-r from-orange-400 to-yellow-400"
                  />
                </div>
                <div className="text-center mt-1 font-bold text-stone-500">{currentIdx + 1}/5</div>
              </div>

              <div className={`bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-md border-b-4 ${timer <= 3 ? 'border-red-500 animate-pulse' : 'border-blue-500'} flex items-center gap-3`}>
                <Timer className={timer <= 3 ? 'text-red-500' : 'text-blue-500'} />
                <span className={`text-2xl font-black ${timer <= 3 ? 'text-red-500' : 'text-blue-600'}`}>{timer}s</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
              {/* Question Area */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <motion.div 
                  key={currentIdx}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-white p-8 rounded-[32px] shadow-xl border-4 border-orange-100 flex-1 flex flex-col justify-center"
                >
                  <h2 className="text-2xl md:text-3xl font-bold leading-relaxed mb-8 text-stone-700">
                    {QUESTIONS[currentIdx].text}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUESTIONS[currentIdx].options.map((opt, i) => (
                      <motion.button
                        key={opt}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onAnswer(opt)}
                        className={`
                          p-6 rounded-2xl text-xl font-black transition-all border-b-8
                          ${feedback === 'CORRECT' && opt === QUESTIONS[currentIdx].answer 
                            ? 'bg-green-500 text-white border-green-700' 
                            : feedback === 'WRONG' && opt !== QUESTIONS[currentIdx].answer
                            ? 'bg-stone-100 text-stone-400 border-stone-300'
                            : 'bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300'}
                        `}
                      >
                        <span className="mr-4 opacity-50">{['A', 'B', 'C', 'D'][i]}.</span>
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Hint Area */}
                <AnimatePresence>
                  {showHint && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-yellow-100 border-l-8 border-yellow-400 p-6 rounded-2xl flex items-start gap-4"
                    >
                      <Lightbulb className="text-yellow-600 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-black text-yellow-800 uppercase text-sm mb-1">Gợi ý cho bé:</h4>
                        <p className="text-lg font-medium text-yellow-900">{QUESTIONS[currentIdx].hint}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scene Area */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-gradient-to-b from-blue-100 to-blue-50 rounded-[32px] shadow-xl border-4 border-white p-6 flex-1 relative overflow-hidden flex flex-col items-center justify-center">
                  {/* Supermarket Shelves Placeholder */}
                  <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-4 pointer-events-none">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="w-12 h-16 bg-stone-400 rounded" />
                    ))}
                  </div>

                  {/* Baby Character */}
                  <div className="relative z-10 flex flex-col items-center">
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-8xl mb-4"
                    >
                      👶
                    </motion.div>
                    
                    {/* Cart */}
                    <div className="relative">
                      <ShoppingCart size={120} className="text-stone-400" strokeWidth={1.5} />
                      
                      {/* Cart Slots */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-2 w-20">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-6 h-6 rounded-md border-2 border-dashed flex items-center justify-center text-xs
                              ${collectedItems[i] ? 'bg-white border-green-400' : 'border-stone-300'}
                            `}
                          >
                            {collectedItems[i]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Overlay */}
                  <AnimatePresence>
                    {feedback === 'CORRECT' && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm"
                      >
                        <CheckCircle2 size={100} className="text-green-500 mb-4" />
                        <h3 className="text-4xl font-black text-green-600">CHÍNH XÁC!</h3>
                        <p className="text-xl font-bold text-green-700 mt-2">Bé nhận được: {QUESTIONS[currentIdx].reward}</p>
                      </motion.div>
                    )}
                    {feedback === 'WRONG' && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm"
                      >
                        <XCircle size={100} className="text-red-500 mb-4" />
                        <h3 className="text-4xl font-black text-red-600">SAI RỒI...</h3>
                        <p className="text-xl font-bold text-red-700 mt-2">Đừng lo, thử lại nhé!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Animating Item */}
                  <AnimatePresence>
                    {animatingItem && (
                      <motion.div
                        key={animatingItem.id}
                        initial={{ scale: 0, x: -100, y: -100, rotate: 0 }}
                        animate={{ 
                          scale: [1, 1.5, 1], 
                          x: 0, 
                          y: 50, 
                          rotate: 360 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute z-30 text-6xl"
                      >
                        {animatingItem.icon}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rewards List */}
                <div className="bg-white p-4 rounded-3xl shadow-lg border-2 border-stone-100">
                  <h4 className="text-center font-black text-stone-400 uppercase text-xs tracking-widest mb-3">Giỏ hàng của bé</h4>
                  <div className="flex justify-center gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-inner transition-all
                          ${collectedItems[i] ? 'bg-orange-50 border-orange-200 scale-110' : 'bg-stone-50 border-stone-100'}
                        `}
                      >
                        {collectedItems[i] || <Gift size={20} className="text-stone-200" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'END' && (
          <motion.div 
            key="end"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="bg-white p-10 rounded-[50px] shadow-2xl border-8 border-green-400 max-w-2xl w-full text-center space-y-8 relative overflow-hidden">
              {/* Decorative Stars */}
              <div className="absolute top-4 left-4 text-yellow-400 animate-bounce"><Star fill="currentColor" size={40} /></div>
              <div className="absolute top-4 right-4 text-yellow-400 animate-bounce delay-100"><Star fill="currentColor" size={40} /></div>

              <div className="space-y-2">
                <h1 className="text-5xl font-black text-green-600">XUẤT SẮC!</h1>
                <p className="text-xl font-bold text-stone-500">Bé đã hoàn thành chuyến đi siêu thị</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-stone-50 p-6 rounded-3xl">
                  <div className="text-stone-400 font-bold text-sm uppercase">Tổng điểm</div>
                  <div className="text-5xl font-black text-orange-500">{score}</div>
                </div>
                <div className="bg-stone-50 p-6 rounded-3xl">
                  <div className="text-stone-400 font-bold text-sm uppercase">Món đồ</div>
                  <div className="text-5xl font-black text-blue-500">{collectedItems.length}/5</div>
                </div>
              </div>

              <div className="py-6 border-y-2 border-stone-100">
                <div className="text-stone-400 font-bold text-sm uppercase mb-2">Danh hiệu</div>
                <div className={`text-3xl font-black ${getTitle(score).color}`}>
                  {getTitle(score).text}
                </div>
              </div>

              <div className="text-left bg-green-50 p-6 rounded-3xl space-y-2">
                <p className="font-bold text-green-800">Thông tin bé:</p>
                <p className="text-lg"><span className="font-bold">Họ tên:</span> {userInfo.name}</p>
                <p className="text-lg"><span className="font-bold">Lớp:</span> {userInfo.class}</p>
              </div>

              <button 
                onClick={() => setGameState('START')}
                className="w-full py-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-2xl font-black shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={28} /> CHƠI LẠI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 3;
        }
      `}</style>
    </div>
  );
}
