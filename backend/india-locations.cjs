"use strict";
let modulePromise;
const load = () => (modulePromise ||= import("@countrystatecity/countries"));
async function states() { const { getStatesOfCountry } = await load(); return (await getStatesOfCountry("IN")).map(({ iso2, name }) => ({ code: iso2, name })).sort((a,b)=>a.name.localeCompare(b.name)); }
async function cities(stateCode) { const { getCitiesOfState } = await load(); return [...new Set((await getCitiesOfState("IN", stateCode)).map(x=>x.name))].sort((a,b)=>a.localeCompare(b)); }
function registerIndiaLocations(app) { app.get("/api/locations/india/states", async (_req,res)=>{ try{res.json({success:true,states:await states()});}catch{res.status(503).json({success:false,message:"India state options are unavailable."});} }); app.get("/api/locations/india/states/:stateCode/cities", async (req,res)=>{ const code=String(req.params.stateCode||"").toUpperCase(); if(!/^[A-Z0-9-]{1,8}$/.test(code)) return res.status(400).json({success:false,message:"Select a valid state."}); try{res.json({success:true,cities:await cities(code)});}catch{res.status(503).json({success:false,message:"City options are unavailable."});} }); }
module.exports={registerIndiaLocations,states,cities};
