import { api, uuid } from '@/lib/api';

export type FundingStatus='draft'|'pending_sponsors'|'scheduled'|'active'|'closing'|'closed'|'expired'|'cancelled';
export interface FundingPlanModel {
  id:string; quest_id:string; round_number:number; version:number; mode:'budget'|'window'; status:FundingStatus; reward_points:number; fee_points:number;
  planned_completions:number; target_points:number; starts_at:string; ends_at:string; sponsorship_deadline?:string|null;
  contributions?:Array<{id:string;funder_kind:'author'|'merchant';committed_points:number;remaining_points:number;held_points:number;paid_reward_points:number;paid_fee_points:number;refunded_points:number}>;
  holds?:Array<{id:string;user_id:string;status:string;expires_at:string}>;
  sponsorships?:Array<{id:string;merchant_id:string;status:string;points:number;voucher_id?:string|null;voucher_qty:number;promo:boolean;terms_version:number;counter_points?:number|null;counter_voucher_id?:string|null;counter_voucher_qty?:number|null;counter_promo?:boolean|null;counter_message?:string|null}>;
}
export interface SponsorVoucher {id:string;title:string;description:string}
export interface SponsorMerchant {id:string;name:string;municipality:string|null;category:string|null;logo_url:string|null;same_municipality?:boolean;vouchers:SponsorVoucher[]}
export type SponsorTerms={points:number;voucher_id?:string|null;voucher_qty:number;promo:boolean;message?:string};
const data=<T>(promise:Promise<{data:{data:T}}>)=>promise.then(r=>r.data.data);

export const getQuestFundingPlan=(questId:string)=>data<{plan:FundingPlanModel|null}>(api.get(`/quests/${encodeURIComponent(questId)}/funding-plan`));
export const getFundingPlan=(planId:string)=>data<FundingPlanModel>(api.get(`/funding-plans/${encodeURIComponent(planId)}`));
export const createFundingPlan=(questId:string,terms:{mode:'budget'|'window';planned_completions:number;starts_at:string;ends_at:string})=>data<FundingPlanModel>(api.post(`/quests/${encodeURIComponent(questId)}/funding-plans`,{...terms,idempotency_key:uuid()}));
export const updateFundingPlan=(id:string,terms:{mode:'budget'|'window';planned_completions:number;starts_at:string;ends_at:string;expected_version:number})=>data<FundingPlanModel>(api.patch(`/funding-plans/${encodeURIComponent(id)}`,{...terms,idempotency_key:uuid()}));
export const contributeToFundingPlan=(id:string,points:number)=>data(api.post(`/funding-plans/${encodeURIComponent(id)}/self-contribution`,{points,idempotency_key:uuid()}));
export const submitFundingPlan=(id:string)=>data<FundingPlanModel>(api.post(`/funding-plans/${encodeURIComponent(id)}/submit`,{idempotency_key:uuid()}));
export const closeFundingPlan=(id:string)=>data<FundingPlanModel>(api.post(`/funding-plans/${encodeURIComponent(id)}/close`,{idempotency_key:uuid()}));
export const cancelFundingPlan=(id:string)=>data<FundingPlanModel>(api.post(`/funding-plans/${encodeURIComponent(id)}/cancel`,{idempotency_key:uuid()}));
export const extendFundingPlan=(id:string,ends_at:string)=>data<FundingPlanModel>(api.post(`/funding-plans/${encodeURIComponent(id)}/extend`,{ends_at,idempotency_key:uuid()}));
export const listSponsorDirectory=(questId:string,q='')=>data<{items:SponsorMerchant[]}>(api.get('/sponsor-directory',{params:{quest_id:questId,q}}));
export const requestQuestSponsorship=(planId:string,merchant_id:string,terms:SponsorTerms)=>data(api.post(`/funding-plans/${encodeURIComponent(planId)}/sponsorships`,{merchant_id,...terms,idempotency_key:uuid()}));
export const withdrawQuestSponsorship=(id:string)=>data(api.post(`/sponsorships/${encodeURIComponent(id)}/withdraw`,{idempotency_key:uuid()}));
export const acceptSponsorshipCounter=(id:string,terms_version:number)=>data(api.post(`/sponsorships/${encodeURIComponent(id)}/accept-counter`,{terms_version,idempotency_key:uuid()}));
