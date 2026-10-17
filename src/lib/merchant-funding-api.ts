import { api,uuid } from '@/lib/api';
export interface MerchantPointSummary{merchant_id:string;balance_points:number;is_test:boolean;history:Array<{id:string;source:string;points:number;reference:string;created_at:string}>}
export interface MerchantSponsorship{ id:string;plan_id:string;plan_status:string;status:string;quest_id:string;quest_title:string;spot_name?:string|null;points:number;voucher_id?:string|null;voucher_qty:number;promo:boolean;terms_version:number;counter_points?:number|null;counter_voucher_id?:string|null;counter_voucher_qty?:number|null;counter_promo?:boolean|null;counter_message?:string|null;message?:string|null;expires_at:string }
export interface MerchantVoucher{ id:string;title:string;description:string;cost_points:number }
const unwrap=<T>(promise:Promise<{data:{data:T}}>)=>promise.then(r=>r.data.data);
export const getMerchantPoints=()=>unwrap<MerchantPointSummary>(api.get('/merchant/points'));
export const buyMerchantPoints=(points:500|1000|2500|5000)=>unwrap(api.post('/merchant/points/purchase',{package:points,idempotency_key:uuid()}));
export const getMerchantVouchers=()=>unwrap<{merchant_id:string;items:MerchantVoucher[]}>(api.get('/merchant/vouchers'));
export const getMerchantSponsorships=(status?:string)=>unwrap<{items:MerchantSponsorship[]}>(api.get('/merchant/sponsorships',{params:status?{status}:{}}));
export const respondToSponsorship=(id:string,action:'accept'|'decline',terms_version:number)=>unwrap(api.post(`/sponsorships/${encodeURIComponent(id)}/${action}`,action==='accept'?{terms_version,idempotency_key:uuid()}:{idempotency_key:uuid()}));
export const counterSponsorship=(id:string,terms_version:number,points:number,voucher_id:string|null,voucher_qty:number,promo:boolean,message?:string)=>unwrap(api.post(`/sponsorships/${encodeURIComponent(id)}/counter`,{points,voucher_id,voucher_qty,promo,message,terms_version,idempotency_key:uuid()}));
export const topUpSponsoredPlan=(planId:string,points:number)=>unwrap(api.post(`/funding-plans/${encodeURIComponent(planId)}/merchant-top-up`,{points,idempotency_key:uuid()}));
