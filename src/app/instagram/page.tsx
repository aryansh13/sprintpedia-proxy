'use client';

import { useCallback, useMemo, useState } from 'react';

// Tipe data tetap sama
type AnyRecord = Record<string, any>;

type NormalizedProfile = {
    name: string | null;
    followers: number | null;
    following: number | null;
    posts: number | null;
    isPrivate: boolean | null;
    spamFilterOn: boolean | null;
};

// --- Helper Functions (Tidak ada perubahan di sini) ---
function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const n = Number(value.replace(/[,._]/g, (m) => (m === ',' ? '' : m)));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function pick<T>(obj: AnyRecord | null | undefined, path: string[]): T | undefined {
    let cur: any = obj;
    for (const key of path) {
        if (cur == null) return undefined;
        cur = cur[key];
    }
    return cur as T | undefined;
}

function normalizeUpstreamProfile(upstream: AnyRecord): NormalizedProfile {
    const name =
        pick<string>(upstream, ['full_name']) ||
        pick<string>(upstream, ['fullname']) ||
        pick<string>(upstream, ['name']) ||
        pick<string>(upstream, ['data', 'full_name']) ||
        pick<string>(upstream, ['user', 'full_name']) ||
        pick<string>(upstream, ['graphql', 'user', 'full_name']) ||
        null;

    const followers =
        toNumber(pick<number | string>(upstream, ['follower'])) ??
        toNumber(pick<number | string>(upstream, ['followers'])) ??
        toNumber(pick<number | string>(upstream, ['followers_count'])) ??
        toNumber(pick<number | string>(upstream, ['edge_followed_by', 'count'])) ??
        toNumber(pick<number | string>(upstream, ['graphql', 'user', 'edge_followed_by', 'count'])) ??
        null;

    const following =
        toNumber(pick<number | string>(upstream, ['following'])) ??
        toNumber(pick<number | string>(upstream, ['follows'])) ??
        toNumber(pick<number | string>(upstream, ['following_count'])) ??
        toNumber(pick<number | string>(upstream, ['edge_follow', 'count'])) ??
        toNumber(pick<number | string>(upstream, ['graphql', 'user', 'edge_follow', 'count'])) ??
        null;

    const posts =
        toNumber(pick<number | string>(upstream, ['posts'])) ??
        toNumber(pick<number | string>(upstream, ['post_count'])) ??
        toNumber(pick<number | string>(upstream, ['media_count'])) ??
        toNumber(pick<number | string>(upstream, ['edge_owner_to_timeline_media', 'count'])) ??
        toNumber(
            pick<number | string>(upstream, ['graphql', 'user', 'edge_owner_to_timeline_media', 'count'])
        ) ?? null;

    const isPrivate =
        pick<boolean>(upstream, ['is_private']) ??
        pick<boolean>(upstream, ['private']) ??
        pick<boolean>(upstream, ['user', 'is_private']) ??
        pick<boolean>(upstream, ['graphql', 'user', 'is_private']) ??
        null;
        
    const spamFilterOn =
        pick<boolean>(upstream, ['spam']) ??
        pick<boolean>(upstream, ['is_spam']) ??
        pick<boolean>(upstream, ['spam_filter']) ??
        pick<boolean>(upstream, ['filters', 'spam']) ??
        null;

    return { name, followers, following, posts, isPrivate, spamFilterOn };
}

// --- Komponen-komponen UI Baru ---

// Komponen Kartu Statistik (Follower, Following, dll.)
function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
                <div className="text-slate-500 dark:text-slate-400">{icon}</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

// Komponen untuk menampilkan hasil (termasuk loading, error, dan data)
function ResultDisplay({ loading, error, normalized }: { loading: boolean; error: string | null; normalized: NormalizedProfile | null; }) {
    if (loading) {
        // Tampilan Skeleton saat loading
        return (
            <div className="mt-8 animate-pulse">
                <div className="h-8 w-48 rounded-md bg-slate-200 dark:bg-slate-700"></div>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                </div>
            </div>
        );
    }

    if (error) {
        // Tampilan Error
        return (
            <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <h3 className="font-semibold text-red-600 dark:text-red-400">Terjadi Kesalahan</h3>
                <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
            </div>
        );
    }
    
    if (!normalized) {
        // Tampilan Awal sebelum ada pencarian
        return (
            <div className="mt-8 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Hasil akan ditampilkan di sini.</p>
            </div>
        );
    }

    // Tampilan Hasil Sukses
    function formatNumber(n: number | null): string {
        if (n == null) return '-';
        try {
            return n.toLocaleString('id-ID');
        } catch {
            return String(n);
        }
    }

    return (
        <section className="mt-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Ringkasan Profil
                </h2>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${normalized.isPrivate ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'}`}>
                        Akun Private: {normalized.isPrivate == null ? '?' : normalized.isPrivate ? 'Ya' : 'Tidak'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${normalized.spamFilterOn ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'}`}>
                        Filter Spam: {normalized.spamFilterOn == null ? '?' : normalized.spamFilterOn ? 'Aktif' : 'Nonaktif'}
                    </span>
                </div>
            </div>
            
            <div className="mt-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                {normalized.name ?? '-'}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Follower"
                    value={formatNumber(normalized.followers)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                />
                <StatCard
                    title="Following"
                    value={formatNumber(normalized.following)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="4"/><path d="M22 20c0-3.37-2-6.5-4-8"/></svg>}
                />
                 <StatCard
                    title="Postingan"
                    value={formatNumber(normalized.posts)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>}
                />
            </div>
        </section>
    );
}


// --- Halaman Utama ---
export default function InstagramPage() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [raw, setRaw] = useState<AnyRecord | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    const normalized = useMemo<NormalizedProfile | null>(() => {
        if (!raw) return null;
        const upstream = (raw as AnyRecord).data ?? raw;
        if (upstream && typeof upstream === 'object') {
            return normalizeUpstreamProfile(upstream as AnyRecord);
        }
        return null;
    }, [raw]);

    const handleFetch = useCallback(async () => {
        if (!username) {
            setError('Username wajib diisi');
            return;
        }
        setLoading(true);
        setError(null);
        setRaw(null);
        try {
            const res = await fetch(`/api/instagram-tools`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(typeof json?.error === 'string' ? json.error : 'Gagal mengambil data');
            } else {
                setRaw(json);
            }
        } catch (e: any) {
            setError(e?.message || 'Terjadi kesalahan jaringan');
        } finally {
            setLoading(false);
        }
    }, [username]);

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
                <header className="text-center">
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
                        <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-400 bg-clip-text text-transparent">
                            Instagram Spam Filter Check
                        </span>
                    </h1>
                    <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                        Cek status profil, filter spam, dan info lainnya dengan cepat.
                    </p>
                </header>

                <section className="mt-10 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-800/50 dark:border dark:border-slate-700">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative w-full">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-slate-400">@</span>
                            </div>
                            <input
                                type="text"
                                placeholder="contoh: natgeo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleFetch(); }}
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-7 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={handleFetch}
                            disabled={loading}
                            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                            {loading && (
                                <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
                                </svg>
                            )}
                            {loading ? 'Mengecek…' : 'Cek Profil'}
                        </button>
                    </div>
                </section>

                {/* Area Hasil yang sekarang dikelola oleh komponen ResultDisplay */}
                <ResultDisplay loading={loading} error={error} normalized={normalized} />

                {raw && !loading && !error && (
                    <section className="mt-8 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-800/50 dark:border dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                Raw JSON Response
                            </h2>
                            <button
                                className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                                onClick={() => setShowRaw((s) => !s)}
                            >
                                {showRaw ? 'Sembunyikan' : 'Tampilkan'}
                            </button>
                        </div>
                        {showRaw && (
                            <pre className="mt-4 max-h-[400px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                                {JSON.stringify(raw, null, 2)}
                            </pre>
                        )}
                    </section>
                )}

                <footer className="mt-16 text-center text-sm text-slate-500 dark:text-slate-400">
                    <p>Dibangun dengan Next.js & Tailwind CSS.</p>
                </footer>
            </div>
        </main>
    );
}