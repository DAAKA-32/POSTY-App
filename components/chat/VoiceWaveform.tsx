"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceWaveformProps {
  isRecording: boolean;
  isProcessing?: boolean;
  barCount?: number;
  className?: string;
}

// Premium easing for smooth animations
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export default function VoiceWaveform({
  isRecording,
  isProcessing = false,
  barCount = 5,
  className = "",
}: VoiceWaveformProps) {
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array(barCount).fill(0.2)
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio analysis when recording starts
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevels = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample different frequency ranges for each bar
        const newLevels = Array(barCount)
          .fill(0)
          .map((_, i) => {
            const startIndex = Math.floor(
              (i / barCount) * dataArray.length * 0.7
            );
            const endIndex = Math.floor(
              ((i + 1) / barCount) * dataArray.length * 0.7
            );
            let sum = 0;
            for (let j = startIndex; j < endIndex; j++) {
              sum += dataArray[j];
            }
            const avg = sum / (endIndex - startIndex) / 255;
            // Normalize to 0.15-1 range for visual appeal
            return Math.max(0.15, Math.min(1, avg * 1.5 + 0.15));
          });

        setAudioLevels(newLevels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (error) {
      // Fallback to animated simulation if audio access fails
      console.warn("Audio analysis unavailable, using simulation");
      simulateAudioLevels();
    }
  }, [barCount]);

  // Fallback: simulate audio levels with random variation
  const simulateAudioLevels = useCallback(() => {
    const updateSimulation = () => {
      setAudioLevels((prev) =>
        prev.map(() => {
          const base = 0.3 + Math.random() * 0.5;
          return Math.max(0.15, Math.min(1, base));
        })
      );
      animationFrameRef.current = requestAnimationFrame(() => {
        setTimeout(updateSimulation, 80);
      });
    };
    updateSimulation();
  }, []);

  // Cleanup audio resources - Critical for iOS microphone indicator
  const stopAudioAnalysis = useCallback(() => {
    // 1. Cancel animation frame first to stop any pending updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 2. Stop all media stream tracks immediately (critical for iOS)
    // This is what releases the microphone and removes the iOS indicator
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach((track) => {
        track.stop();
        // Ensure track is fully released
        track.enabled = false;
      });
      mediaStreamRef.current = null;
    }

    // 3. Close AudioContext to release audio resources
    if (audioContextRef.current) {
      // Suspend first, then close for cleaner shutdown
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.suspend().then(() => {
          audioContextRef.current?.close().catch(() => {
            // Ignore close errors (may already be closed)
          });
        }).catch(() => {
          // Fallback: try direct close if suspend fails
          audioContextRef.current?.close().catch(() => {});
        });
      }
      audioContextRef.current = null;
    }

    // 4. Clear analyser reference
    analyserRef.current = null;

    // 5. Reset visual levels
    setAudioLevels(Array(barCount).fill(0.2));
  }, [barCount]);

  // Effect to manage audio analysis lifecycle
  // Critical: stopAudioAnalysis must run immediately when isRecording becomes false
  // to release the microphone and remove iOS indicator
  useEffect(() => {
    if (isRecording) {
      startAudioAnalysis();
    } else {
      // Immediate cleanup when recording stops
      stopAudioAnalysis();
    }

    // Cleanup on unmount or when recording state changes
    return () => {
      stopAudioAnalysis();
    };
  }, [isRecording, startAudioAnalysis, stopAudioAnalysis]);

  // Additional cleanup on component unmount to guarantee microphone release
  useEffect(() => {
    return () => {
      // Force stop all tracks on unmount regardless of state
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Processing state animation
  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className={`flex items-center justify-center gap-1.5 ${className}`}
      >
        {/* Pulsing processing dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: smoothEase }}
          className={`flex items-center justify-center gap-[3px] h-8 ${className}`}
        >
          {audioLevels.map((level, index) => (
            <motion.div
              key={index}
              className="w-1 rounded-full bg-gradient-to-t from-primary to-primary/70"
              initial={{ height: 4 }}
              animate={{
                height: Math.max(4, level * 28),
                opacity: 0.6 + level * 0.4,
              }}
              transition={{
                duration: 0.08,
                ease: "linear",
              }}
              style={{
                boxShadow:
                  level > 0.5
                    ? `0 0 ${Math.floor(level * 8)}px rgba(248, 163, 93, ${level * 0.4})`
                    : "none",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Circular pulsing indicator for listening state
export function ListeningIndicator({
  isActive,
  size = "md",
}: {
  isActive: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const innerSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className={`relative ${sizeClasses[size]} flex items-center justify-center`}
        >
          {/* Outer pulsing rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{
                scale: [1, 1.8 + i * 0.3],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Inner glowing dot */}
          <motion.div
            className={`${innerSizeClasses[size]} rounded-full bg-primary`}
            animate={{
              scale: [1, 1.15, 1],
              boxShadow: [
                "0 0 0 0 rgba(248, 163, 93, 0.4)",
                "0 0 20px 4px rgba(248, 163, 93, 0.6)",
                "0 0 0 0 rgba(248, 163, 93, 0.4)",
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline waveform for input field
export function InlineVoiceWaveform({
  isRecording,
  isProcessing,
}: {
  isRecording: boolean;
  isProcessing?: boolean;
}) {
  const [levels, setLevels] = useState([0.3, 0.5, 0.7, 0.5, 0.3]);

  useEffect(() => {
    if (!isRecording) {
      setLevels([0.3, 0.5, 0.7, 0.5, 0.3]);
      return;
    }

    const interval = setInterval(() => {
      setLevels((prev) =>
        prev.map((_, i) => {
          const centerWeight = 1 - Math.abs(i - 2) * 0.15;
          return 0.2 + Math.random() * 0.8 * centerWeight;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  if (isProcessing) {
    return (
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-[2px] h-5 overflow-hidden"
        >
          {levels.map((level, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-primary"
              animate={{
                height: `${Math.max(20, level * 100)}%`,
              }}
              transition={{
                duration: 0.1,
                ease: "linear",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
