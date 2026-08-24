'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, normalizeGovernanceConfig, normalizeProposal, ProposalModel, GovernanceConfigModel, computeVoteFeeSplit } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ProposalCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Vote,
  PlusCircle,
  ThumbsUp,
  ThumbsDown,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Flame,
  Vault,
  Sparkles,
  Users,
  Clock,
  Loader2,
} from 'lucide-react';

const VOTED_KEY = (proposalId: string) => `jdq_voted_${proposalId}`;

export default function VotePage() {
  const { wallet, refreshWallet } = useAuth();
  const { isReady } = useRequireAuth();
  const [proposals, setProposals] = useState<ProposalModel[]>([]);
  const [config, setConfig] = useState<GovernanceConfigModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Voting Modal State
  const [voteModalProposal, setVoteModalProposal] = useState<ProposalModel | null>(null);
  const [voteChoice, setVoteChoice] = useState<'yes' | 'no'>('yes');
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votedMap, setVotedMap] = useState<Record<string, 'yes' | 'no'>>({});

  // Suggest Location Modal State
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [category, setCategory] = useState('eco');
  const [description, setDescription] = useState('');
  const [submittingLocation, setSubmittingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);

  const fetchProposals = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: rawProposals } = await fetchWithCache(
        'governance_proposals',
        async () => {
          const res = await api.get('/proposals');
          if (!res.data?.success) throw new Error('Proposals unavailable');
          return (res.data.data as Parameters<typeof normalizeProposal>[0][]).map(normalizeProposal);
        },
        { ttlMs: 120_000, forceRefresh }
      );
      setProposals(rawProposals);
    } catch {
      setFetchError('Could not reach the governance server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const { data: rawConfig } = await fetchWithCache(
        'governance_config',
        async () => {
          const res = await api.get('/proposals/config');
          if (!res.data?.success) throw new Error('Config unavailable');
          return normalizeGovernanceConfig(res.data.data);
        },
        { ttlMs: 300_000 }
      );
      setConfig(rawConfig);
    } catch (e) {
      console.error('Failed to load governance config', e);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchConfig();
    // Restore already-voted state from confirmed votes in this browser (server still enforces).
    const restored: Record<string, 'yes' | 'no'> = {};
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('jdq_voted_')) {
        const choice = localStorage.getItem(key);
        if (choice === 'yes' || choice === 'no') {
          restored[key.replace('jdq_voted_', '')] = choice;
        }
      }
    });
    setVotedMap(restored);
  }, [fetchProposals, fetchConfig]);

  const handleCastVote = async () => {
    if (!voteModalProposal) return;
    setVoting(true);
    setVoteError(null);

    const idempotencyKey = `vote_${voteModalProposal.id}_${Date.now()}`;

    try {
      const res = await api.post(`/proposals/${voteModalProposal.id}/vote`, {
        idempotency_key: idempotencyKey,
        choice: voteChoice,
      });

      if (res.data?.success) {
        localStorage.setItem(VOTED_KEY(voteModalProposal.id), voteChoice);
        setVotedMap((prev) => ({ ...prev, [voteModalProposal.id]: voteChoice }));
        await fetchProposals(true);
        await refreshWallet();
        setVoteModalProposal(null);
      } else {
        setVoteError(res.data?.error?.message || 'Vote submission failed.');
      }
    } catch (e: any) {
      setVoteError(e.response?.data?.error?.message || 'Failed to submit vote.');
    }
    setVoting(false);
  };

  const handleSuggestLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !locationName || !description) {
      setLocationError('Please fill out all required fields.');
      return;
    }

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
        setLocationSuccess('Proposal submitted! It is now pending admin screening.');
        setTitle('');
        setLocationName('');
        setDescription('');
        await fetchProposals(true);
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
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Header Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#D5C4AC]/60 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFB703]" />
                  <span className="text-xs font-black tracking-wider text-[#7D5800] uppercase">
                    COMMUNITY VOTING ARENA
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    POWERED BY mJDQ
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black font-serif text-[#582F0E]">
                  Govern Pangasinan Tourism Spots
                </h1>
                <p className="text-xs md:text-sm text-[#514532] max-w-xl leading-relaxed">
                  {config
                    ? `Cast paid binary votes (${voteFeeSplit?.fee} mJDQ per vote). ${(config.burnBps / 100).toFixed(0)}% is burned permanently, the rest enters community reward escrow.`
                    : 'Cast paid binary votes to approve destination proposals. Fees come from the live governance config and are disclosed before you confirm.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60 flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-[#2D6A4F]" />
                  <div>
                    <div className="text-[10px] font-bold text-[#837560] uppercase">mJDQ Coin Wallet</div>
                    <div className="text-sm font-extrabold text-[#2D6A4F]">
                      {wallet ? `${wallet.balanceMjdq} mJDQ` : '—'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSuggestModalOpen(true)}
                  className="inline-flex items-center gap-2 gold-gradient text-[#582F0E] font-black px-6 py-3.5 rounded-2xl shadow-md hover:scale-105 transition transform text-xs cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Suggest Location</span>
                </button>
              </div>
            </div>
          </div>

          {/* Arena Proposals Grid */}
          <div>
            <h2 className="text-xl font-black font-serif text-[#582F0E] mb-4">Active Spot Proposals</h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true" aria-label="Loading proposals">
                <ProposalCardSkeleton />
                <ProposalCardSkeleton />
              </div>
            ) : fetchError ? (
              <div className="bg-white p-8 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] space-y-4 shadow-xs">
                <p>{fetchError}</p>
                <button
                  onClick={() => fetchProposals(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold transition cursor-pointer active:scale-95"
                >
                  Retry
                </button>
              </div>
            ) : proposals.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] shadow-xs">
                No spot proposals yet. Suggest the first destination!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {proposals.map((prop) => {
                  const userVote = votedMap[prop.id];
                  const totalVotes = prop.yesVotes + prop.noVotes;
                  const yesPct = totalVotes > 0 ? Math.round((prop.yesVotes / totalVotes) * 100) : 0;
                  const noPct = totalVotes > 0 ? Math.round((prop.noVotes / totalVotes) * 100) : 0;
                  const quorumMet = totalVotes >= prop.quorumRequired;
                  const canVote = prop.state === 'voting' && !userVote;

                  return (
                    <div
                      key={prop.id}
                      className="bg-white rounded-3xl border-2 border-[#D5C4AC]/40 p-6 flex flex-col justify-between shadow-sm space-y-4 hover:border-[#FFB703] transition duration-200"
                    >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-xl bg-[#FAF9F5] text-[#837560] border border-[#D5C4AC]/40">
                          {prop.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-xl bg-amber-100 text-[#7D5800]">
                          {prop.state}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold font-serif text-[#582F0E]">{prop.title}</h3>
                      <div className="text-xs text-[#837560] font-bold">{prop.locationName}</div>
                      <p className="text-xs text-[#514532] leading-relaxed">{prop.description}</p>

                      {/* Governance metrics from the live proposal */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D5C4AC]/40">
                          <div className="text-[#837560] font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" /> Eligible voters
                          </div>
                          <div className="font-extrabold text-[#582F0E]">{prop.eligibleVoterSnapshot}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D5C4AC]/40">
                          <div className="text-[#837560] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Quorum
                          </div>
                          <div className={`font-extrabold ${quorumMet ? 'text-[#2D6A4F]' : 'text-[#BC4749]'}`}>
                            {totalVotes}/{prop.quorumRequired}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D5C4AC]/40">
                          <div className="text-[#837560] font-semibold">Organizer bond</div>
                          <div className="font-extrabold text-[#582F0E]">
                            {prop.organizerBondMjdq} mJDQ
                            <span className="text-[#837560] font-semibold"> · {prop.bondStatus}</span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D5C4AC]/40">
                          <div className="text-[#837560] font-semibold flex items-center gap-1">
                            <Vault className="w-3 h-3" /> Reward escrow
                          </div>
                          <div className="font-extrabold text-[#2D6A4F]">{prop.escrowMjdq} mJDQ</div>
                        </div>
                      </div>

                      {prop.votingClosesAt && prop.state === 'voting' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#837560] font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Voting closes {new Date(prop.votingClosesAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar & Vote Breakdown */}
                    <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#D5C4AC]/40 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#2D6A4F] flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" /> YES: {prop.yesVotes} ({yesPct}%)
                        </span>
                        <span className="text-[#BC4749] flex items-center gap-1">
                          <ThumbsDown className="w-3.5 h-3.5" /> NO: {prop.noVotes} ({noPct}%)
                        </span>
                      </div>

                      <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-[#2D6A4F] transition-all duration-500"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action area: only the voting lifecycle allows votes */}
                    {userVote ? (
                      <div className="py-3 bg-[#2D6A4F]/10 text-[#2D6A4F] font-black text-xs text-center rounded-2xl">
                        Vote Cast: {userVote.toUpperCase()}
                      </div>
                    ) : prop.state === 'voting' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setVoteModalProposal(prop);
                            setVoteChoice('yes');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-md transition"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Vote YES</span>
                        </button>
                        <button
                          onClick={() => {
                            setVoteModalProposal(prop);
                            setVoteChoice('no');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-[#BC4749] hover:bg-red-800 text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-md transition"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>Vote NO</span>
                        </button>
                      </div>
                    ) : (
                      <div className="py-3 bg-[#FAF9F5] text-[#837560] font-bold text-xs text-center rounded-2xl border border-[#D5C4AC]/40">
                        {prop.state === 'screening' && 'Awaiting admin screening approval...'}
                        {prop.state === 'draft' && 'Draft proposal — pending submission'}
                        {prop.state === 'scheduled' && 'Approved — scheduled quest'}
                        {prop.state === 'active' && 'Quest is live'}
                        {prop.state === 'feedback' && 'In community feedback phase'}
                        {prop.state === 'closed' && 'Voting closed'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paid Vote Confirmation & Token Allocation Modal (Stitch 12.png Match) */}
        {voteModalProposal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="vote-dialog-title" className="bg-[#FFFDF7] max-w-md w-full rounded-3xl p-6 sm:p-8 border-2 border-[#E8DCB8] shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
              <h3 id="vote-dialog-title" className="text-2xl font-black font-serif text-[#582F0E]">
                Confirm Vote?
              </h3>

              <p className="text-xs text-[#514532] font-semibold leading-relaxed">
                You're about to cast your vote for your chosen destination: <br />
                <span className="font-extrabold text-[#582F0E]">"{voteModalProposal.title}"</span>
              </p>

              {/* 3D JDQ Coin Badge (Official Asset) */}
              <div className="py-3 px-6 rounded-2xl bg-amber-50 border border-amber-200/80 inline-flex items-center gap-3 mx-auto shadow-inner">
                <img src="/jdq-token.png" alt="JDQ Token" className="w-12 h-12 object-contain drop-shadow-md animate-pulse" />
                <div className="text-3xl font-black text-[#582F0E]">
                  {voteFeeSplit ? Math.round(voteFeeSplit.feeJdq || 5) : 5} JDQ
                </div>
              </div>

              <p className="text-[11px] text-[#837560] leading-relaxed px-2">
                The winner of the voting will receive the collected funds to support the rehabilitation and improvement of the selected tourist spot. Confirm your vote to show your support and help fund the preservation of these beautiful places.
              </p>

              {/* Fee Split Badge */}
              {voteFeeSplit && (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold text-left pt-1">
                  <div className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-200/60 flex items-center justify-between">
                    <span>🔥 Burn (50%):</span>
                    <span>{voteFeeSplit.burn} mJDQ</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-between">
                    <span>🏛️ Treasury (50%):</span>
                    <span>{voteFeeSplit.escrow} mJDQ</span>
                  </div>
                </div>
              )}

              {voteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{voteError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVoteModalProposal(null)}
                  className="py-3 px-5 rounded-2xl border-2 border-red-400 text-red-600 font-extrabold text-xs hover:bg-red-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCastVote}
                  disabled={voting || !voteFeeSplit}
                  className="py-3 px-5 rounded-2xl border-2 border-emerald-500 bg-[#48C71D] hover:bg-[#3FB418] text-white font-extrabold text-xs shadow-lg transition"
                >
                  {voting ? 'Casting...' : 'Vote'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Location Modal */}
        {suggestModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form role="dialog" aria-modal="true" aria-labelledby="suggest-dialog-title" onSubmit={handleSuggestLocation} className="bg-white max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 id="suggest-dialog-title" className="text-lg font-bold font-serif text-[#582F0E]">Suggest New Location</h3>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setSuggestModalOpen(false)}
                  className="text-xs font-bold text-[#837560] hover:text-[#582F0E]"
                >
                  Cancel
                </button>
              </div>

              {locationSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{locationSuccess}</span>
                </div>
              )}

              {locationError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#582F0E] mb-1">Destination Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patar White Beach Eco Trail"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C4AC] text-xs focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#582F0E] mb-1">Municipality / Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bolinao, Pangasinan"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C4AC] text-xs focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#582F0E] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C4AC] text-xs focus:outline-none focus:border-[#2D6A4F] bg-white"
                >
                  <option value="eco">Eco-Tourism</option>
                  <option value="cultural">Cultural Heritage</option>
                  <option value="food_trade">Food & Culinary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#582F0E] mb-1">Description & Significance</label>
                <textarea
                  rows={3}
                  placeholder="Describe why this destination should be featured..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C4AC] text-xs focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingLocation}
                className="w-full flex items-center justify-center gap-2 gold-gradient text-[#582F0E] font-black py-3.5 px-6 rounded-2xl shadow-md transition text-xs"
              >
                {submittingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Proposal for Screening</span>}
              </button>
            </form>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </Navigation>
  );
}
