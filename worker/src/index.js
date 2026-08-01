const MAX_REQUEST_BYTES = 8 * 1024 * 1024;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length > 0
    ? (allowed.includes(origin) ? origin : '')
    : origin;
  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(request, env, value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function secureEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

async function authorize(request, env) {
  const header = request.headers.get('Authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided || !env.EXPORT_TOKEN) return false;
  return secureEqual(provided, env.EXPORT_TOKEN);
}

async function getTenantAccessToken(env) {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET })
  });
  const result = await response.json();
  if (!response.ok || result.code !== 0 || !result.tenant_access_token) {
    throw new Error('Feishu auth failed: ' + (result.msg || response.status));
  }
  return result.tenant_access_token;
}

async function uploadToFeishu(file, env) {
  const token = await getTenantAccessToken(env);
  const body = new FormData();
  body.append('file_name', file.name || 'picture-drawer-' + Date.now() + '.jpg');
  body.append('parent_type', 'explorer');
  body.append('parent_node', env.FEISHU_FOLDER_TOKEN);
  body.append('size', String(file.size));
  body.append('file', file, file.name);

  const response = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body
  });
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error('Feishu upload failed: ' + (result.msg || response.status) + ' code=' + (result.code || 'none'));
  }
  return result.data?.file_token || '';
}

async function appendToSheet(env, metadata, fileToken) {
  if (!env.FEISHU_SHEET_TOKEN) return;
  try {
    const token = await getTenantAccessToken(env);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const response = await fetch(
      'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/' + env.FEISHU_SHEET_TOKEN + '/values_append',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          valueRange: {
            range: '',
            values: [[metadata.fileName || '', metadata.date || '', metadata.category || '', metadata.style || '', metadata.stall || '', fileToken, now]]
          }
        })
      }
    );
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      console.error('Sheet append failed:', JSON.stringify(result));
    }
  } catch (error) {
    console.error('Sheet append error:', error instanceof Error ? error.message : 'Unknown');
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return json(request, env, { ok: true });
      }

      // Diagnostic endpoint - test Feishu connection without uploading
      if (url.pathname === '/test-feishu' && request.method === 'GET') {
        const hasAppId = !!env.FEISHU_APP_ID;
        const hasAppSecret = !!env.FEISHU_APP_SECRET;
        const hasFolderToken = !!env.FEISHU_FOLDER_TOKEN;
        const hasExportToken = !!env.EXPORT_TOKEN;
        const hasSheetToken = !!env.FEISHU_SHEET_TOKEN;
        
        let feishuTest = null;
        let feishuError = null;
        
        if (hasAppId && hasAppSecret) {
          try {
            const token = await getTenantAccessToken(env);
            feishuTest = { tenant_access_token: 'OK (length=' + token.length + ')' };
          } catch (e) {
            feishuError = e instanceof Error ? e.message : 'Unknown';
          }
        }
        
        return json(request, env, {
          ok: true,
          config: {
            feishu_app_id: hasAppId,
            feishu_app_secret: hasAppSecret,
            feishu_folder_token: hasFolderToken,
            export_token: hasExportToken,
            feishu_sheet_token: hasSheetToken
          },
          feishu_test: feishuTest,
          feishu_error: feishuError
        });
      }

      if (url.pathname !== '/api/export/feishu' || request.method !== 'POST') {
        return json(request, env, { ok: false, error: 'Not found' }, 404);
      }

      if (!(await authorize(request, env))) {
        return json(request, env, { ok: false, error: 'Unauthorized' }, 401);
      }

      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (contentLength > MAX_REQUEST_BYTES) {
        return json(request, env, { ok: false, error: 'Image is too large' }, 413);
      }
      if (!request.headers.get('Content-Type')?.includes('multipart/form-data')) {
        return json(request, env, { ok: false, error: 'Expected multipart form data' }, 415);
      }

      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0 || !file.type.startsWith('image/')) {
        return json(request, env, { ok: false, error: 'A valid image file is required' }, 400);
      }
      if (file.size > MAX_REQUEST_BYTES) {
        return json(request, env, { ok: false, error: 'Image is too large' }, 413);
      }

      const category = form.get('category') || '';
      const style = form.get('style') || '';
      const stall = form.get('stall') || '';
      const date = form.get('date') || '';

      const fileToken = await uploadToFeishu(file, env);

      await appendToSheet(env, {
        fileName: file.name || '',
        category,
        style,
        stall,
        date
      }, fileToken);

      return json(request, env, { ok: true, fileToken });
    } catch (error) {
      console.error(JSON.stringify({
        message: 'Feishu export failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: new URL(request.url).pathname
      }));
      return json(request, env, {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }, 502);
    }
  }
};
