'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import type { AuthService } from '@/lib/authConfig';
import {
    awaitCallToken,
    clearPendingCall,
    getPendingCall,
    getToken,
    initCall,
    normalizePhone,
    savePendingCall,
} from '@/lib/authApi';

export default function AuthGate({
    service,
    appIcon,
    onAuthenticated,
    onClose,
}: {
    service: AuthService;
    appIcon?: string;
    onAuthenticated: (token: string) => void;
    onClose: () => void;
}) {
    const [phone, setPhone] = useState('');
    const [callPhonePretty, setCallPhonePretty] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const checkNowRef = useRef(false);

    const showError = (cause: any) => {
        setError(
            cause?.message === 'expired'
                ? 'Время проверки истекло. Попробуйте снова.'
                : cause?.message === 'timeout'
                  ? 'Звонок не подтверждён. Попробуйте снова.'
                  : 'Ошибка авторизации. Попробуйте позже.',
        );
    };

    const awaitToken = async (checkId: string) => {
        setLoading(true);
        abortRef.current = new AbortController();
        try {
            const token = await awaitCallToken(service, checkId, {
                signal: abortRef.current.signal,
                checkNow: () => {
                    if (!checkNowRef.current) return false;
                    checkNowRef.current = false;
                    return true;
                },
            });
            clearPendingCall();
            onAuthenticated(token);
        } catch (cause: any) {
            if (cause?.message === 'aborted') return;
            if (cause?.message === 'expired' || cause?.message === 'timeout') clearPendingCall();
            showError(cause);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const pending = getPendingCall(service);
        if (!pending) return;
        setPhone(pending.phone);
        setCallPhonePretty(pending.callPhonePretty);
        void awaitToken(pending.checkId);
        return () => abortRef.current?.abort();
    }, [service]);

    const startLogin = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!normalizePhone(phone)) {
            setError('Введите корректный номер телефона');
            return;
        }

        setError(null);
        setLoading(true);
        setCallPhonePretty(null);
        checkNowRef.current = false;

        try {
            const { checkId, callPhonePretty: nextCallPhone, confirmed } = await initCall(service.apiUrl, phone);
            if (confirmed) {
                clearPendingCall();
                onAuthenticated((await getToken(service.apiUrl, checkId)).token);
                return;
            }

            setCallPhonePretty(nextCallPhone);
            savePendingCall({
                serviceKey: service.key,
                phone,
                checkId,
                callPhonePretty: nextCallPhone,
                startedAt: Date.now(),
            });
            void awaitToken(checkId);
        } catch (cause) {
            showError(cause);
            setLoading(false);
        }
    };

    const copyNumber = async () => {
        if (!callPhonePretty) return;
        try {
            await navigator.clipboard.writeText(callPhonePretty);
        } catch {
            const input = document.createElement('textarea');
            input.value = callPhonePretty;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const close = () => {
        clearPendingCall();
        abortRef.current?.abort();
        onClose();
    };

    return (
        <div className="auth-overlay" role="presentation" onClick={close}>
            <section
                className="auth-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="auth-close" aria-label="Закрыть" onClick={close}>
                    <Icon name="close" size={18} />
                </button>
                {appIcon && <img src={appIcon} alt="" width="64" height="64" className="auth-logo" />}
                <h2 id="auth-title" className="auth-title">Вход по номеру телефона</h2>

                {!callPhonePretty ? (
                    <form onSubmit={startLogin}>
                        <p className="auth-text">Авторизация нужна только один раз. Для продолжения подтвердите номер звонком.</p>
                        <input
                            className="auth-input"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+7 900 000-00-00"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            disabled={loading}
                        />
                        {error && <p className="auth-error">{error}</p>}
                        <button type="submit" className="button-primary button-block" disabled={loading}>
                            {loading ? <span className="spinner" aria-label="Проверяем" /> : 'Продолжить'}
                        </button>
                        <p className="auth-note">
                            Нажимая «Продолжить», вы соглашаетесь на обработку номера телефона для входа.
                        </p>
                    </form>
                ) : (
                    <div>
                        <p className="auth-text">Позвоните на номер:</p>
                        <a href={`tel:${callPhonePretty}`} className="auth-phone">{callPhonePretty}</a>
                        <div className="auth-actions">
                            <a href={`tel:${callPhonePretty}`} className="button-soft">
                                <Icon name="phone" size={16} />
                                Позвонить
                            </a>
                            <button type="button" className="button-soft" onClick={copyNumber}>
                                <Icon name="copy" size={16} />
                                {copied ? 'Скопировано' : 'Копировать'}
                            </button>
                        </div>
                        <p className="auth-note auth-note-top">Мы определим ваш номер автоматически.</p>
                        {error && <p className="auth-error">{error}</p>}
                        <button
                            type="button"
                            className="button-primary button-block"
                            onClick={() => { checkNowRef.current = true; }}
                        >
                            {loading ? 'Проверяем…' : 'Позвонил, проверить'}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
