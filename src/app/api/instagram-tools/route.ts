import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
	try {
		const { username } = await req.json();
		if (!username) {
			return NextResponse.json({ ok: false, error: 'username IG wajib diisi' }, { status: 400 });
		}

		// Step 1: GET login page → ambil csrf_cookie
		const getLogin = await fetch('https://sprintpedia.id/auth/login', {
			headers: { 'User-Agent': 'Mozilla/5.0' },
		});
		const setCookiesLogin = getLogin.headers.get('set-cookie');
		const csrfMatch = (setCookiesLogin || '').split(',').join(';').match(/csrf_cookie=([^;]+)/);
		const csrfToken = csrfMatch?.[1];
		if (!csrfToken) {
			return NextResponse.json({ ok: false, error: 'Gagal ambil CSRF token' }, { status: 500 });
		}

		// Step 2: POST login dengan form-data
		const form = new FormData();
		form.append('csrf_token', csrfToken);
		form.append('username', process.env.SPRINTPEDIA_USERNAME as string);
		form.append('password', process.env.SPRINTPEDIA_PASSWORD as string);

		const loginResp = await fetch('https://sprintpedia.id/request/auth/login', {
			method: 'POST',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				Referer: 'https://sprintpedia.id/auth/login',
				Origin: 'https://sprintpedia.id',
				Cookie: `csrf_cookie=${csrfToken}`,
			},
			body: form,
		});
		const loginJson = await loginResp.json().catch(() => ({}));
		const setCookiesAfterLogin = loginResp.headers.get('set-cookie');
		const ciMatch = (setCookiesAfterLogin || '').split(',').join(';').match(/ci_session=([^;]+)/);
		const ciSession = ciMatch?.[1];

		if (!ciSession) {
			return NextResponse.json({ ok: false, error: 'Login gagal, ci_session tidak diterima', debug: loginJson });
		}

		// Step 3: GET tools pakai cookie login
		const toolsResp = await fetch(
			`https://sprintpedia.id/page/instagram_tools?username=${encodeURIComponent(username)}`,
			{
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					Cookie: `csrf_cookie=${csrfToken}; ci_session=${ciSession}`,
					'User-Agent': 'Mozilla/5.0',
				},
			}
		);

		const text = await toolsResp.text();
		let data: any;
		try { data = JSON.parse(text); } catch {}
		const root = data?.data ?? data;
		const msg = String(root?.detail ?? root?.message ?? '').toLowerCase();
		const isEmptyObj = !!root && typeof root === 'object' && !Array.isArray(root) && Object.keys(root).length === 0;
		const upstream404 = toolsResp.status === 404;

		if (upstream404 || !root || isEmptyObj || msg.includes('not found') || msg.includes('tidak ditemukan')) {
			return NextResponse.json({ ok: false, error: 'Username tidak ditemukan' }, { status: 404 });
		}

		return NextResponse.json({
			ok: true,
			data: data ?? { raw: text },
			// source: 'sprintpedia',
			// checked_at: new Date().toISOString(),
			// debug: [{ step: 'tools-status', status: toolsResp.status }],
		});
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e?.message || 'Terjadi kesalahan' }, { status: 500 });
	}
}


