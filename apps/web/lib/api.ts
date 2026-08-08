'use client';

const tokenKey = 'blinkfy_access_token';
const workspaceKey = 'blinkfy_workspace_id';
const clientKey = 'blinkfy_client_id';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

function storage() {
    return typeof window === 'undefined' ? null : window.localStorage;
}

export function getActiveWorkspaceId() {
    return storage()?.getItem(workspaceKey) ?? '';
}

export function setActiveWorkspaceId(workspaceId: string) {
    storage()?.setItem(workspaceKey, workspaceId.trim());
}

export function getActiveClientId() {
    return storage()?.getItem(clientKey) ?? '';
}

export function setActiveClientId(clientId: string) {
    storage()?.setItem(clientKey, clientId.trim());
}

export function setAccessToken(token: string) {
    storage()?.setItem(tokenKey, token.trim());
}

export function clearSession() {
    storage()?.removeItem(tokenKey);
    storage()?.removeItem(workspaceKey);
    storage()?.removeItem(clientKey);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const currentStorage = storage();
    const token = currentStorage?.getItem(tokenKey);
    const workspaceId = currentStorage?.getItem(workspaceKey);
    const headers = new Headers(init.headers);

    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (workspaceId) headers.set('x-workspace-id', workspaceId);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${path}`, { ...init, headers });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        if (response.status === 401) clearSession();
        const message = payload?.message
            ?? payload?.errors?.[0]?.message
            ?? (response.status === 404 ? 'This item is unavailable.' : 'The request could not be completed.');
        throw new ApiError(response.status, message);
    }
    return payload as T;
}
