'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  Navigation,
  RotateCcw,
} from 'lucide-react';
import {
  fetchNearbyQuizzes,
  fetchMyQuizHistory,
  NearbyQuizInvitation,
  UserQuizHistoryItem,
} from '@/lib/quizzes';
import { useAuth } from '@/lib/auth';

export function QuizLobbyClient() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<NearbyQuizInvitation[]>([]);
  const [history, setHistory] = useState<UserQuizHistoryItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [locationMessage, setLocationMessage] = useState<string>('');

  const requestLocationAndFetch = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationMessage('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLocationMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationStatus('granted');
        try {
          const list = await fetchNearbyQuizzes(pos.coords.latitude, pos.coords.longitude);
          setQuizzes(list || []);
        } catch {
          setQuizzes([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLocationStatus('denied');
        setQuizzes([]);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationMessage('Location permission was denied. Turn on location to see quizzes near you.');
        } else {
          setLocationMessage('Unable to determine your GPS location. Please check your connection and retry.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocationAndFetch();
  }, [requestLocationAndFetch]);

  // Load user quiz history if signed in
  useEffect(() => {
    let mounted = true;
    if (user) {
      void fetchMyQuizHistory().then((hist) => {
        if (mounted && hist) {
          setHistory(hist);
        }
      }).catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [user]);

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.destination_name.toLowerCase().includes(search.toLowerCase()) ||
      q.municipality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-16">
      {/* Lobby Hero */}
      <section className="border-b border-amber-500/20 bg-gradient-to-b from-amber-950/30 via-zinc-900/60 to-zinc-950 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Juander Quiz Show Arcade
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-100 font-serif tracking-tight">
            Heritage Quiz Lobby
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
            Step into the retro quiz cabinets of Pangasinan. Answer five checkpoints of cultural folklore,
            historical architecture, and coastal geography to earn verified XP rewards and passport stamps.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md pt-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by town or quiz topic..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-200 text-sm focus:outline-none focus:border-amber-400 font-sans"
            />
          </div>
        </div>
      </section>

      {/* Cabinets Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold font-serif text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Available Cabinets
          </h2>
          {locationStatus === 'granted' && (
            <span className="text-xs font-mono text-zinc-500">
              {filteredQuizzes.length} {filteredQuizzes.length === 1 ? 'Quiz' : 'Quizzes'} Ready
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-mono text-zinc-400">Detecting your location for nearby heritage cabinets...</p>
          </div>
        )}

        {/* Geolocation Denied / Unavailable state */}
        {!loading && locationStatus !== 'granted' && (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Navigation className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold font-serif text-zinc-100">
                Turn on location to see quizzes near you
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                {locationMessage ||
                  'Heritage quizzes are unlockable when you visit registered cultural landmarks in Pangasinan. Allow location access in your browser to view active cabinets in range.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={requestLocationAndFetch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono transition-transform active:scale-95 shadow-md shadow-amber-500/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Enable Location Access
              </button>
            </div>
          </div>
        )}

        {/* Location Granted: Empty or List */}
        {!loading && locationStatus === 'granted' && filteredQuizzes.length === 0 && (
          <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-3">
            <HelpCircle className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm text-zinc-400">
              {search
                ? 'No arcade cabinets match your search criteria.'
                : 'No active heritage quizzes found within range of your current location.'}
            </p>
          </div>
        )}

        {!loading && locationStatus === 'granted' && filteredQuizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredQuizzes.map((quiz) => {
              const isPastCompleted = history.some(
                (h) => h.quiz_id === quiz.quiz_id && h.status === 'passed'
              );

              return (
                <div
                  key={quiz.quiz_id}
                  className="group relative rounded-2xl border border-zinc-800 hover:border-amber-500/50 bg-zinc-900/80 p-5 sm:p-6 backdrop-blur-sm transition-all duration-200 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-amber-950/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {quiz.municipality}
                      </span>
                      {isPastCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Passed
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold font-serif text-zinc-100 group-hover:text-amber-300 transition-colors">
                      {quiz.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        +{quiz.xp_reward} XP
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        5 Checkpoints
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500">
                      Target Spot: {quiz.destination_name}
                    </span>
                    <Link
                      href={`/quiz/${encodeURIComponent(quiz.quiz_id)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono shadow-md shadow-amber-500/10 transition-transform active:scale-95"
                    >
                      Enter Cabinet
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Attempt History Section */}
      {history.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <div className="border-t border-zinc-800/80 pt-6">
            <h2 className="text-base sm:text-lg font-bold font-serif text-zinc-200 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              Your Recent Runs
            </h2>

            <div className="space-y-2">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {item.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="text-zinc-200 font-medium truncate font-sans">
                      {item.quiz_title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 flex-shrink-0">
                    <span className={item.status === 'passed' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                      {item.score}/5
                    </span>
                    {item.xp_awarded > 0 && (
                      <span className="text-amber-400 font-bold">+{item.xp_awarded} XP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
