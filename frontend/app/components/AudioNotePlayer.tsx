/**
 * Audio Note Player Component
 * 
 * HOW TO USE:
 * 1. Place your .wav file in the public directory:
 *    /frontend/public/your-audio.wav
 * 
 * 2. Import and use in any page:
 *    import AudioNotePlayer from '@/app/components/AudioNotePlayer'
 * 
 *    export default function YourPage() {
 *      return <AudioNotePlayer audioPath="/your-audio.wav" />
 *    }
 * 
 * 3. Customize with optional props:
 *    <AudioNotePlayer 
 *      audioPath="/your-audio.wav"      // REQUIRED - path to your .wav file in /public
 *      buttonText="Open Notes"          // Optional - custom button text
 *      className="custom-class"         // Optional - additional CSS classes
 *    />
 * 
 * EXAMPLE:
 *    <AudioNotePlayer audioPath="/sounds/synth.wav" buttonText="Play Notes" />
 * 
 * FEATURES:
 * - Click button to open sliding panel from right
 * - 12 piano tiles (C through B including sharps)
 * - Pitch shifting using Web Audio API (playbackRate = 2^(semitones/12))
 * - Backdrop overlay that closes panel
 * - Works with any .wav file
 */

'use client'

import { useState } from 'react'

interface AudioNotePlayerProps {
  audioPath: string          // Path to .wav file (e.g., "/audio/sound.wav")
  buttonText?: string        // Optional button text
  className?: string         // Optional CSS classes
}

export default function AudioNotePlayer({ 
  audioPath,
  buttonText = 'Note Player',
  className = ''
}: AudioNotePlayerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const NOTES = [
    { name: 'C', semitones: 0, isSharp: false },
    { name: 'C#', semitones: 1, isSharp: true },
    { name: 'D', semitones: 2, isSharp: false },
    { name: 'D#', semitones: 3, isSharp: true },
    { name: 'E', semitones: 4, isSharp: false },
    { name: 'F', semitones: 5, isSharp: false },
    { name: 'F#', semitones: 6, isSharp: true },
    { name: 'G', semitones: 7, isSharp: false },
    { name: 'G#', semitones: 8, isSharp: true },
    { name: 'A', semitones: 9, isSharp: false },
    { name: 'A#', semitones: 10, isSharp: true },
    { name: 'B', semitones: 11, isSharp: false },
  ]

  const playNote = async (semitones: number, noteName: string) => {
    try {
      const audioContext = new AudioContext()
      const response = await fetch(audioPath)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.value = Math.pow(2, semitones / 12)
      source.connect(audioContext.destination)
      source.start(0)
      
      console.log(`Playing: ${noteName} (${semitones} semitones, rate: ${source.playbackRate.value.toFixed(3)})`)
    } catch (error) {
      console.error(`Error playing ${noteName}:`, error)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        {isOpen ? 'Close' : buttonText}
      </button>

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Note Player</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {NOTES.map((note) => (
              <button
                key={note.name}
                onClick={() => playNote(note.semitones, note.name)}
                className={`
                  h-24 rounded-lg font-bold text-lg transition-all hover:scale-105 active:scale-95
                  ${note.isSharp 
                    ? 'bg-gray-800 text-white hover:bg-gray-700' 
                    : 'bg-white text-gray-800 hover:bg-gray-100 border-2 border-gray-300'
                  }
                `}
              >
                {note.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-300 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
