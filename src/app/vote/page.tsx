'use client';

import React, { useState, useEffect } from 'react';
import { api, ProposalModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import {
  Vote,
  PlusCircle,
  ThumbsUp,
  ThumbsDown,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Flame,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function VotePage() {
  const { wallet, refreshWallet } = useAuth();
  const [proposals, setProposals] = useState<ProposalModel[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/proposals');
      if (res.data?.success && res.data.data.length > 0) {
        setProposals(res.data.data);
      } else {
        fallbackProposals();
      }
    } catch (e) {
      fallbackProposals();
    }
    setLoading(false);
  };

  const fallbackProposals = () => {
    setProposals([
      {
        id: 'prop_1',
        title: 'Add Patar White Beach Eco Trail',
        location_name: 'Bolinao, Pangasinan',
        category: 'eco',
        description: 'Add an eco-quest covering coastal rock formations, white sand beach trail, and Cape Bolinao lighthouse viewing tower.',
        status: 'voting',
        submitted_by_id: 'user-1',
        submitted_by_name: 'Juan Dela Cruz',
        yes_votes: 18,
        no_votes: 3,
        yes_weight_mjdq: 180,
        no_weight_mjdq: 30,
        total_voters: 21,
        bond_mjdq: 25000,
        escrowed_mjdq: 168,
      },
      {
        id: 'prop_2',
        title: 'Add Tayug Sunflower Maze Quest',
        location_name: 'Tayug, Pangasinan',
        category: 'eco',
        description: 'Create an interactive agricultural quest at the famous sunflower maze park in eastern Pangasinan.',
        status: 'voting',
        submitted_by_id: 'user-2',
        submitted_by_name: 'Maria Santos',
        yes_votes: 12,
        no_votes: 1,
        yes_weight_mjdq: 120,
        no_weight_mjdq: 10,
        total_voters: 13,
        bond_mjdq: 25000,
        escrowed_mjdq: 104,
      },
      {
        id: 'prop_3',
        title: 'Add San Fabian Beach Heritage Trail',
        location_name: 'San Fabian, Pangasinan',
        category: 'cultural',
        description: 'Feature WWII historic landing sites along San Fabian beach park.',
        status: 'voting',
        submitted_by_id: 'user-1',
        submitted_by_name: 'Juan Dela Cruz',
        yes_votes: 8,
        no_votes: 0,
        yes_weight_mjdq: 80,
        no_weight_mjdq: 0,
        total_voters: 8,
        bond_mjdq: 25000,
        escrowed_mjdq: 64,
      },
    ]);
  };

  const handleCastVote = async () => {
    if (!voteModalProposal) return;
    setVoting(true);
    setVoteError(null);

    const idempotencyKey = `vote_${voteModalProposal.id}_${Date.now()}`;

    try {
      const res = await api.post(`/proposals/${voteModalProposal.id}/votes`, {
        choice: voteChoice,
        idempotency_key: idempotencyKey,
      });

      if (res.data?.success) {
        setVotedMap((prev) => ({ ...prev, [voteModalProposal.id as string]: voteChoice }));
        await refreshWallet();
        await fetchProposals();
        setVoteModalProposal(null);
      } else {
        setVoteError(res.data?.error?.message || 'Vote failed');
      }
    } catch (e: any) {
      setVoteError(e.response?.data?.error?.message || 'Failed to cast vote. Check balance and eligibility.');
    }
    setVoting(false);
  };

  const handleSuggestLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !locationName) return;
    setSubmittingLocation(true);

    try {
      const res = await api.post('/proposals', {
        title,
        location_name: locationName,
        category,
        description: description || 'Community suggested Pangasinan destination.',
      });

      if (res.data?.success) {
        const newId = res.data.data.id;
        await api.post(`/proposals/${newId}/submit`);
        setLocationSuccess(`Location proposal "${title}" submitted for screening!`);
        setTitle('');
        setLocationName('');
        setDescription('');
        setTimeout(() => {
          setSuggestModalOpen(false);
          setLocationSuccess(null);
          fetchProposals();
        }, 1500);
      }
    } catch (e: any) {
      console.error(e);
    }
    setSubmittingLocation(false);
  };

  return (
    <Navigation>
      <div className="space-y-6">
        {/* Banner Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#FFB703] shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wider text-[#7D5800] uppercase">
                  COMMUNITY GOVERNANCE
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2D6A4F]/10 text-[#2D6A4F]">
                  POWERED BY mJDQ
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-serif text-[#582F0E]">
                Govern Pangasinan Tourism Spots
              </h1>
              <p className="text-xs md:text-sm text-[#514532] max-w-xl leading-relaxed">
                Cast paid binary votes (10 mJDQ per vote) to approve destination proposals. 20% is burned permanently, 80% enters community reward escrow.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60 flex items-center gap-3">
                <Wallet className="w-6 h-6 text-[#2D6A4F]" />
                <div>
                  <div className="text-[10px] font-bold text-[#837560] uppercase">Your Wallet</div>
                  <div className="text-sm font-extrabold text-[#2D6A4F]">
                    {wallet ? `${wallet.balance_mjdq} mJDQ` : '1,000 mJDQ'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSuggestModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#FFB703] hover:bg-amber-400 text-[#582F0E] font-extrabold px-5 py-3.5 rounded-2xl shadow-md transition text-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Suggest Location</span>
              </button>
            </div>
          </div>
        </div>

        {/* Proposals List */}
        <div>
          <h2 className="text-lg font-bold font-serif text-[#582F0E] mb-4">Active Proposals</h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#837560]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3F6653] mb-2" />
              <span className="text-xs font-medium">Loading community proposals...</span>
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
              No active governance proposals available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proposals.map((prop) => {
                const userVote = votedMap[prop.id.toString()];
                const totalVotes = prop.yes_votes + prop.no_votes;
                const yesPct = totalVotes > 0 ? Math.round((prop.yes_votes / totalVotes) * 100) : 0;
                const noPct = totalVotes > 0 ? Math.round((prop.no_votes / totalVotes) * 100) : 0;

                return (
                  <div
                    key={prop.id.toString()}
                    className="bg-white rounded-2xl border border-[#D5C4AC]/40 p-6 flex flex-col justify-between shadow-sm space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#EFEEEA] text-[#837560]">
                          {prop.category}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-amber-100 text-[#7D5800]">
                          {prop.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold font-serif text-[#582F0E]">
                        {prop.title}
                      </h3>
                      <div className="text-xs text-[#837560] font-medium">{prop.location_name}</div>
                      <p className="text-xs text-[#514532] leading-relaxed">{prop.description}</p>
                    </div>

                    {/* Vote Tallies Bar */}
                    <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#D5C4AC]/40 flex items-center justify-around text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#2D6A4F]">
                        <ThumbsUp className="w-4 h-4" />
                        <span>YES: {prop.yes_votes} ({yesPct}%)</span>
                      </div>
                      <div className="w-px h-4 bg-[#D5C4AC]" />
                      <div className="flex items-center gap-1.5 font-bold text-[#BC4749]">
                        <ThumbsDown className="w-4 h-4" />
                        <span>NO: {prop.no_votes} ({noPct}%)</span>
                      </div>
                    </div>

                    {/* Voting Action Buttons */}
                    {userVote ? (
                      <div className="py-2.5 bg-[#2D6A4F]/10 text-[#2D6A4F] font-bold text-xs text-center rounded-xl">
                        Vote Cast: {userVote.toUpperCase()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setVoteModalProposal(prop);
                            setVoteChoice('yes');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Vote YES</span>
                        </button>
                        <button
                          onClick={() => {
                            setVoteModalProposal(prop);
                            setVoteChoice('no');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#BC4749] hover:bg-red-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>Vote NO</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paid Vote Disclosure Modal */}
        {voteModalProposal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {voteChoice === 'yes' ? (
                    <ThumbsUp className="w-6 h-6 text-[#2D6A4F]" />
                  ) : (
                    <ThumbsDown className="w-6 h-6 text-[#BC4749]" />
                  )}
                  <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                    Confirm Paid Vote ({voteChoice.toUpperCase()})
                  </h3>
                </div>
                <button
                  onClick={() => setVoteModalProposal(null)}
                  className="text-xs font-bold text-[#837560] hover:text-[#582F0E]"
                >
                  Cancel
                </button>
              </div>

              <div className="text-xs font-bold text-[#582F0E]">Target: "{voteModalProposal.title}"</div>

              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#837560]">Vote Fee:</span>
                  <span className="font-bold text-[#7D5800]">10 mJDQ (0.01 JDQ)</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>Burn Allocation (20%):</span>
                  <span className="font-bold">2 mJDQ</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Reward Escrow (80%):</span>
                  <span className="font-bold">8 mJDQ</span>
                </div>
              </div>

              {voteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{voteError}</span>
                </div>
              )}

              <button
                onClick={handleCastVote}
                disabled={voting}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl text-white shadow-md transition text-xs ${
                  voteChoice === 'yes' ? 'bg-[#2D6A4F] hover:bg-[#1B4332]' : 'bg-[#BC4749] hover:bg-red-800'
                }`}
              >
                {voting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Cast {voteChoice.toUpperCase()} Vote</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Suggest Location Modal */}
        {suggestModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSuggestLocation} className="bg-white max-w-lg w-full rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-serif text-[#582F0E]">Suggest New Location</h3>
                <button
                  type="button"
                  onClick={() => setSuggestModalOpen(false)}
                  className="text-xs font-bold text-[#837560] hover:text-[#582F0E]"
                >
                  Cancel
                </button>
              </div>

              {locationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{locationSuccess}</span>
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
                className="w-full flex items-center justify-center gap-2 bg-[#FFB703] hover:bg-amber-400 text-[#582F0E] font-extrabold py-3 px-6 rounded-xl shadow-md transition text-xs"
              >
                {submittingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Proposal for Screening</span>}
              </button>
            </form>
          </div>
        )}
      </div>
    </Navigation>
  );
}
