
function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected an object');return v;}
function arr(v,label='array'){if(!Array.isArray(v)||v.length>500)throw Error(label+' must be an array with at most 500 items');return v;}
function str(v){if(typeof v!=='string'||!v.trim()||v.length>100000)throw Error('Expected nonempty text (max 100000 characters)');return v;}
function num(v,label='number',min=-1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||Math.abs(v)>1e12)throw Error(label+' must be a finite number in range');return v;}
function bool(v){if(typeof v!=='boolean')throw Error('Expected a boolean');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Expected YYYY-MM-DD');const t=Date.parse(v+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return t;}
export function run(x){obj(x);if(JSON.stringify(x).length>200000)throw Error('Input exceeds 200 KB limit');

num(x.initial,'initial stock',0);let stock=x.initial;const seen=new Set();const rows=arr(x.events,'events').map(e=>{str(e.id);num(e.delta,'delta');if(seen.has(e.id))return {id:e.id,status:'duplicate ignored',stock};seen.add(e.id);if(stock+e.delta<0)return {id:e.id,status:'rejected: negative inventory',stock};stock+=e.delta;return {id:e.id,status:'applied',stock};});return {metrics:{stock,rejected:rows.filter(r=>r.status.startsWith('rejected')).length,duplicates:rows.filter(r=>r.status.startsWith('duplicate')).length},rows};

}
