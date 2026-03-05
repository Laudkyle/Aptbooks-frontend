import{i as n,e as a}from"./index-DdEGcRtF.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]],i=n("user-x",c);function u(r){return{list:async()=>(await r.get(a.core.users.list)).data,create:async e=>(await r.post(a.core.users.create,e)).data,detail:async e=>(await r.get(a.core.users.detail(e))).data,update:async(e,s)=>(await r.patch(a.core.users.update(e),s)).data,disable:async e=>(await r.patch(a.core.users.disable(e))).data,enable:async e=>(await r.post(a.core.users.enable(e))).data,remove:async e=>(await r.delete(a.core.users.remove(e))).data,assignRoles:async(e,s)=>(await r.post(a.core.users.assignRoles(e),{roleIds:s})).data,removeRoles:async(e,s)=>(await r.delete(a.core.users.removeRoles(e),{data:{roleIds:s}})).data,loginHistory:async(e,s)=>(await r.get(a.core.users.loginHistoryAdmin(e,s))).data}}export{i as U,u as m};
