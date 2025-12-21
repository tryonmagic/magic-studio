/**
 * CORS helper function for API routes
 * Adds CORS headers to allow storefront requests
 */

// #region agent log
fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:8',message:'CORS helper created',data:{hasCorsHelper:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

export function addCorsHeaders(request, response) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:12',message:'addCorsHeaders called',data:{method:request.method,url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const origin = request.headers.get("origin");
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:17',message:'Origin header value',data:{origin:origin||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Clone response to add headers
  const headers = new Headers(response.headers);
  
  // Add CORS headers
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:30',message:'CORS headers added',data:{allowOrigin:headers.get('Access-Control-Allow-Origin')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

export function cors(request, response) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:40',message:'cors wrapper called',data:{method:request.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:45',message:'OPTIONS preflight request',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return addCorsHeaders(
      request,
      new Response(null, { status: 204 })
    );
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fe30dbe4-e3f4-48bb-baf3-29446e184787',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cors.server.js:53',message:'Returning CORS response',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return addCorsHeaders(request, response);
}
