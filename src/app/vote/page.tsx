'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth';
import {
  api,
  normalizeProposal,
  normalizeGovernanceConfig,
  normalizeWallet,
  computeVoteFeeSplit,
  ProposalModel,
  GovernanceConfigModel,
  WalletModel,
} from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ProposalCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Vote,
  PlusCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Flame,
  Landmark,
} from 'lucide-react';

export default function VotePage() {
  const { user } = useAuth();
  const { isReady } = useRequireAuth();

  const [proposals, setProposals] = useState<ProposalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [config, setConfig] = useState<GovernanceConfigModel | null>(null);
  const [wallet, setWallet] = useState<WalletModel | null>(null);

  // In-Page Proposal Creation Workbench (No Modal)
  const [suggestFormOpen, setSuggestFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [category, setCategory] = useState('eco');
  const [description, setDescription] = useState('');
  const [submittingLocation, setSubmittingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);

  // In-Page Active Voting Workbench on specific card (No Modal)
  const [activeVotingProposalId, setActiveVotingProposalId] = useState<string | null>(null);
  const [voteChoice, setVoteChoice] = useState<'yes' | 'no'>('yes');
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votedMap, setVotedMap] = useState<Record<string, 'yes' | 'no'>>({});

  const fetchProposals = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const [pRes, cRes, wRes] = await Promise.all([
        fetchWithCache(
          'proposals_list',
          async () => {
            const res = await api.get('/proposals');
            return (res.data.data as Parameters<typeof normalizeProposal>[0][]).map(normalizeProposal);
          },
          { ttlMs: 60_000, forceRefresh }
        ),
        fetchWithCache(
          'proposals_config',
          async () => {
            const res = await api.get('/proposals/config');
            return normalizeGovernanceConfig(res.data.data);
          },
          { ttlMs: 300_000, forceRefresh }
        ),
        fetchWithCache(
          'user_wallet_balance',
          async () => {
            const res = await api.get('/wallet');
            return normalizeWallet(res.data.data);
          },
          { ttlMs: 30_000, forceRefresh }
        ),
      ]);

      setProposals(pRes.data);
      setConfig(cRes.data);
      setWallet(wRes.data);
    } catch {
      setFetchError('Could not reach governance servers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleCastVote = async (proposal: ProposalModel) => {
    setVoting(true);
    setVoteError(null);

    try {
      const res = await api.post(`/proposals/${proposal.id}/vote`, {
        choice: voteChoice,
      });

      if (res.data?.success) {
        setVotedMap((prev) => ({ ...prev, [proposal.id]: voteChoice }));
        setActiveVotingProposalId(null);
        await fetchProposals(true);
      } else {
        setVoteError(res.data?.error?.message || 'Vote failed');
      }
    } catch (e: any) {
      setVoteError(e.response?.data?.error?.message || 'Network error while casting vote.');
    }
    setVoting(false);
  };

  const handleSuggestLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLocation(true);
    setLocationError(null);
    setLocationSuccess(null);

    try {
      const res = await api.post('/proposals', {
        title,
        location_name: locationName,
        category,
        description,
      });

      if (res.data?.success) {
        setLocationSuccess('Proposal submitted successfully! It is now queued for LGU admin screening.');
        setTitle('');
        setLocationName('');
        setDescription('');
        await fetchProposals(true);
        setTimeout(() => setSuggestFormOpen(false), 2000);
      } else {
        setLocationError(res.data?.error?.message || 'Failed to create proposal.');
      }
    } catch (e: any) {
      setLocationError(e.response?.data?.error?.message || 'Error submitting proposal.');
    }
    setSubmittingLocation(false);
  };

  const voteFeeSplit = config ? computeVoteFeeSplit(config) : null;

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Governance Proposals">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E3DFD5] shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFB703]" />
                  <span className="text-xs font-black tracking-wider text-[#7D5800] uppercase">
                    Pangasinan Tourism DAO Arena
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    mJDQ Governance
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black font-serif text-[#582F0E]">
                  Community Tourism Proposals
                </h1>
                <p className="text-xs md:text-sm text-[#514532] max-w-2xl leading-relaxed">
                  {config
                    ? `Cast community votes (${voteFeeSplit?.fee} mJDQ per vote). ${(config.burnBps / 100).toFixed(0)}% is permanently burned and ${(100 - config.burnBps / 100).toFixed(0)}% enters the LGU tourism improvement escrow.`
                    : 'Cast community votes to approve new eco-trails and heritage sites in Pangasinan.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-[#2D6A4F]" />
                  <div>
                    <div className="text-[10px] font-bold text-[#837560] uppercase">mJDQ Token Balance</div>
                    <div className="text-sm font-extrabold text-[#2D6A4F]">
                      {wallet ? `${wallet.balanceMjdq} mJDQ` : '100 mJDQ'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSuggestFormOpen(!suggestFormOpen)}
                  className="inline-flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black px-6 py-4 rounded-2xl shadow-md transition transform active:scale-95 text-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{suggestFormOpen ? 'Close Form' : 'Suggest Destination'}</span>
                  {suggestFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* In-Page Expandable Suggestion Workbench (No Modal) */}
          {suggestFormOpen && (
            <div className="bg-[#FFFDF7] rounded-3xl p-6 sm:p-8 border border-[#E8DCB8] shadow-md space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E8DCB8] pb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#2D6A4F]" />
                  <h2 className="font-serif font-black text-lg text-[#582F0E]">
                    Submit a Destination Proposal to the DAO
                  </h2>
                </div>
                <span className="text-xs text-gray-500 font-bold">LGU Community Curation</span>
              </div>

              {locationSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{locationSuccess}</span>
                </div>
              )}

              {locationError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              <form onSubmit={handleSuggestLocation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-[#582F0E] uppercase tracking-wider mb-1.5">
                      Destination Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patar White Beach Eco Trail"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D5C4AC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#582F0E] uppercase tracking-wider mb-1.5">
                      Municipality / Location
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bolinao, Pangasinan"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D5C4AC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#582F0E] uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D5C4AC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] cursor-pointer"
                    >
                      <option value="eco">Eco-Tourism &amp; Trails</option>
                      <option value="cultural">Cultural Heritage</option>
                      <option value="food_trade">Food &amp; Culinary MSME</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#582F0E] uppercase tracking-wider mb-1.5">
                    Proposal Description &amp; Heritage Significance
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain why this destination should be integrated into JuanDerQuest quest rewards..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D5C4AC] text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSuggestFormOpen(false)}
                    className="px-5 py-3 rounded-2xl bg-white border border-[#D5C4AC] text-xs font-bold text-gray-600 hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLocation}
                    className="px-8 py-3 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {submittingLocation ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit to Community'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Proposals Grid Layout (Full 12 Columns / Multi-Column Cards) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black font-serif text-[#582F0E]">
                Active Voting Proposals ({proposals.length})
              </h2>
              <span className="text-xs font-bold text-gray-500">Live Quad-Weighted Voting</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProposalCardSkeleton />
                <ProposalCardSkeleton />
                <ProposalCardSkeleton />
              </div>
            ) : fetchError ? (
              <div className="bg-white p-8 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
                <p className="font-bold">{fetchError}</p>
                <button
                  onClick={() => fetchProposals(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black cursor-pointer active:scale-95"
                >
                  Retry
                </button>
              </div>
            ) : proposals.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E3DFD5] text-center text-xs text-gray-500 shadow-xs">
                No active proposals found. Click &quot;Suggest Destination&quot; above to create one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {proposals.map((prop) => {
                  const userVote = votedMap[prop.id];
                  const totalVotes = prop.yesVotes + prop.noVotes;
                  const yesPct = totalVotes > 0 ? Math.round((prop.yesVotes / totalVotes) * 100) : 0;
                  const isVotingOpen = activeVotingProposalId === prop.id;

                  return (
                    <article
                      key={prop.id}
                      className="bg-white rounded-3xl p-6 border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-amber-50 text-[#7D5800] border border-amber-200">
                            {prop.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-stone-100 text-gray-600 uppercase">
                            {prop.state}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-black font-serif text-[#582F0E]">{prop.title}</h3>
                          <p className="text-xs text-[#2D6A4F] font-bold">{prop.locationName}</p>
                        </div>

                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {prop.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E3DFD5] space-y-2">
                          <div className="flex justify-between text-xs font-extrabold">
                            <span className="text-[#2D6A4F]">YES: {prop.yesVotes} ({yesPct}%)</span>
                            <span className="text-[#BC4749]">NO: {prop.noVotes} ({100 - yesPct}%)</span>
                          </div>

                          <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-[#2D6A4F] transition-all duration-500"
                              style={{ width: `${yesPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Inline Voting Confirmation Box (No Modal) */}
                        {isVotingOpen && (
                          <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8DCB8] space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-[#582F0E]">
                                Confirm {voteChoice.toUpperCase()} Vote?
                              </span>
                              <span className="text-xs font-black text-[#2D6A4F]">
                                -{voteFeeSplit?.fee || 500} mJDQ
                              </span>
                            </div>

                            {voteFeeSplit && (
                              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                                <div className="p-1.5 rounded-lg bg-red-50 text-red-700">
                                  🔥 Burn: {voteFeeSplit.burn} mJDQ
                                </div>
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
                                  🏛️ Escrow: {voteFeeSplit.escrow} mJDQ
                                </div>
                              </div>
                            )}

                            {voteError && (
                              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px]">
                                {voteError}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveVotingProposalId(null)}
                                className="py-2 px-3 rounded-xl border border-[#D5C4AC] text-xs font-bold text-gray-600 hover:bg-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCastVote(prop)}
                                disabled={voting}
                                className="py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {voting ? 'Casting...' : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Area */}
                      {!isVotingOpen && (
                        <div>
                          {userVote ? (
                            <div className="py-3 bg-[#2D6A4F]/10 text-[#2D6A4F] font-black text-xs text-center rounded-2xl">
                              ✓ Vote Recorded: {userVote.toUpperCase()}
                            </div>
                          ) : prop.state === 'voting' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  setActiveVotingProposalId(prop.id);
                                  setVoteChoice('yes');
                                }}
                                className="py-3 px-3 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span>Vote YES</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveVotingProposalId(prop.id);
                                  setVoteChoice('no');
                                }}
                                className="py-3 px-3 rounded-2xl bg-[#BC4749] hover:bg-red-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                                <span>Vote NO</span>
                              </button>
                            </div>
                          ) : (
                            <div className="py-2.5 bg-[#FAF9F5] text-gray-500 font-bold text-xs text-center rounded-2xl border border-[#E3DFD5]">
                              {prop.state === 'screening' ? 'Under LGU Review' : `Status: ${prop.state}`}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
